/**
 * Google Sheets 로그 저장용 Apps Script
 *
 * [Script Properties]
 * - SPREADSHEET_ID : Google Sheets 주소의 /d/와 /edit 사이 문자열
 * - SHARED_SECRET  : Vercel의 GOOGLE_SCRIPT_SECRET과 동일한 긴 임의 문자열
 * - SHEET_NAME     : responses (생략하면 responses 사용)
 *
 * [배포]
 * Deploy > New deployment > Web app
 * Execute as: Me
 * Who has access: Anyone
 */

const HEADERS = [
  "timestamp",
  "submission_id",
  "source",
  "scale_type",
  "answer",
  "topic_score",
  "concepts_score",
  "comparison_score",
  "examples_score",
  "expression_score",
  "raw_score_5",
  "rank_at_submission",
  "total_at_submission",
  "mean_at_submission",
  "population_stddev_at_submission",
  "z_score_at_submission",
  "percentile_by_z_at_submission",
  "top_percent_at_submission",
  "achievement_level_at_submission",
  "strength",
  "improvement",
  "needs_review",
  "model",
  "openai_response_id"
];

function doGet() {
  return jsonResponse({
    ok: true,
    service: "music-ai-evaluator-sheet-log",
    message: "Google Apps Script endpoint is running."
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const payload = parsePayload(e);
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty("SHARED_SECRET");

    if (!expectedSecret) {
      throw new Error("Script Property SHARED_SECRET이 설정되지 않았습니다.");
    }

    if (!payload.secret || payload.secret !== expectedSecret) {
      return jsonResponse({
        ok: false,
        error: "인증에 실패했습니다."
      });
    }

    lock.waitLock(30000);

    const sheet = getOrCreateSheet();
    ensureHeaders(sheet);

    const currentScore = toFiniteNumber(payload.rawScore5, "rawScore5");
    const previousScores = getExistingScores(sheet);
    const allScores = previousScores.concat([currentScore]);
    const stats = calculateStatistics(allScores, currentScore);

    const row = [
      safeText(payload.timestamp, 50),
      safeText(payload.submissionId, 100),
      safeText(payload.source, 50),
      safeText(payload.scaleType, 20),
      safeText(payload.answer, 1000),
      toFiniteNumber(payload.topicScore, "topicScore"),
      toFiniteNumber(payload.conceptsScore, "conceptsScore"),
      toFiniteNumber(payload.comparisonScore, "comparisonScore"),
      toFiniteNumber(payload.examplesScore, "examplesScore"),
      toFiniteNumber(payload.expressionScore, "expressionScore"),
      currentScore,
      stats.rank,
      stats.totalRespondents,
      stats.mean,
      stats.standardDeviation,
      stats.zScore,
      stats.percentileByZ,
      stats.topPercent,
      stats.achievementLevel,
      safeText(payload.strength, 1500),
      safeText(payload.improvement, 1500),
      Boolean(payload.needsReview),
      safeText(payload.model, 100),
      safeText(payload.openaiResponseId, 150)
    ];

    sheet.appendRow(row);

    return jsonResponse({
      ok: true,
      stats: stats
    });
  } catch (error) {
    console.error(error);

    return jsonResponse({
      ok: false,
      error: error && error.message
        ? error.message
        : "Google Sheets 저장 중 알 수 없는 오류가 발생했습니다."
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // 잠금을 얻기 전에 오류가 난 경우 무시합니다.
    }
  }
}

function setupSheet() {
  const sheet = getOrCreateSheet();
  ensureHeaders(sheet);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);

  return {
    spreadsheetId: getConfig().spreadsheetId,
    sheetName: sheet.getName(),
    headerCount: HEADERS.length
  };
}

function getConfig() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID");
  const sheetName = properties.getProperty("SHEET_NAME") || "responses";

  if (!spreadsheetId) {
    throw new Error("Script Property SPREADSHEET_ID가 설정되지 않았습니다.");
  }

  return {
    spreadsheetId: spreadsheetId,
    sheetName: sheetName
  };
}

function getOrCreateSheet() {
  const config = getConfig();
  const spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(config.sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(config.sheetName);
  }

  return sheet;
}

function ensureHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const firstRow = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const hasHeaders = HEADERS.every(function(header, index) {
    return firstRow[index] === header;
  });

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#EAF0FF");
    sheet.setFrozenRows(1);
  }
}

function getExistingScores(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  return sheet
    .getRange(2, 11, lastRow - 1, 1)
    .getValues()
    .flat()
    .map(Number)
    .filter(Number.isFinite);
}

function calculateStatistics(scores, currentScore) {
  const total = scores.length;
  const mean = scores.reduce(function(sum, score) {
    return sum + score;
  }, 0) / total;

  const variance = scores.reduce(function(sum, score) {
    const difference = score - mean;
    return sum + difference * difference;
  }, 0) / total;

  const standardDeviation = Math.sqrt(variance);
  const rank = 1 + scores.filter(function(score) {
    return score > currentScore;
  }).length;

  const tieCount = scores.filter(function(score) {
    return score === currentScore;
  }).length;

  const zScore = standardDeviation === 0
    ? 0
    : (currentScore - mean) / standardDeviation;

  const percentileByZ = standardDeviation === 0
    ? 50
    : normalCdf(zScore) * 100;

  const topPercent = 100 - percentileByZ;

  let achievementLevel;
  if (standardDeviation === 0) {
    achievementLevel = "중";
  } else if (zScore >= 0.5) {
    achievementLevel = "상";
  } else if (zScore >= -0.5) {
    achievementLevel = "중";
  } else {
    achievementLevel = "하";
  }

  return {
    totalRespondents: total,
    rank: rank,
    rankLabel: tieCount > 1 ? "공동 " + rank + "위" : rank + "위",
    mean: round(mean, 2),
    standardDeviation: round(standardDeviation, 2),
    zScore: round(zScore, 2),
    percentileByZ: round(percentileByZ, 1),
    topPercent: round(topPercent, 1),
    achievementLevel: achievementLevel
  };
}

function normalCdf(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const y = 1 - (
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
    t *
    Math.exp(-absX * absX)
  );

  return sign * y;
}

function toFiniteNumber(value, fieldName) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(fieldName + " 값이 숫자가 아닙니다.");
  }

  return number;
}

function safeText(value, maxLength) {
  return String(value == null ? "" : value)
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("POST 본문이 없습니다.");
  }

  return JSON.parse(e.postData.contents);
}

function round(value, digits) {
  const places = digits == null ? 2 : digits;
  const factor = Math.pow(10, places);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
