const EVENT_SHEET = "Event_Log";
const SCORE_SHEET = "Score_Log";
const EVENT_HEADERS = ["Server_Timestamp","Event_ID","Student_ID","Session_ID","Site_Version","Unit","Section","Page","Mode","Event_Type","Activity_ID","Question_ID","Result","Score_Earned","Score_Possible","Percent","Duration_Seconds","Details","Client_Timestamp"];
const SCORE_HEADERS = ["Server_Timestamp","Score_Event_ID","Student_ID","Session_ID","Site_Version","Unit","Section","Activity_Mode","Activity_ID","Attempt","Correct","Total","Percentage","Duration_Seconds","Details","Client_Timestamp"];
const SCORE_EVENT_TYPES = ["test_completed", "multiple_choice_completed", "practice_completed"];

function doGet() {
  return json_({ ok: true, message: "HIST 1301 Progress Tracker is running" });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const event = normalizeEvent_(data);
    if (!event.event_id) throw new Error("event_id is required");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const eventSheet = requireSheet_(ss, EVENT_SHEET, EVENT_HEADERS);
    const scoreSheet = requireSheet_(ss, SCORE_SHEET, SCORE_HEADERS);

    const now = new Date();
    const duplicate = hasId_(eventSheet, 2, event.event_id);
    if (!duplicate) eventSheet.appendRow([now,event.event_id,event.student_id,event.session_id,event.site_version,event.unit,event.section,event.page,event.mode,event.event_type,event.activity_id,event.question_id,event.result,event.score_earned,event.score_possible,event.percent,event.duration_seconds,event.details,event.client_timestamp]);

    if (SCORE_EVENT_TYPES.indexOf(event.event_type) !== -1 && !hasId_(scoreSheet, 2, event.event_id)) {
      const details = parseDetails_(event.details);
      scoreSheet.appendRow([now,event.event_id,event.student_id,event.session_id,event.site_version,event.unit,event.section,event.mode,event.activity_id,cleanNumber_(details.attempt),event.score_earned,event.score_possible,event.percent,event.duration_seconds,event.details,event.client_timestamp]);
    }
    return json_({ ok: true, event_id: event.event_id, duplicate: duplicate });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function normalizeEvent_(data) {
  return {
    event_id: clean_(data.event_id, 100), student_id: clean_(data.student_id || "S1", 40),
    session_id: clean_(data.session_id, 100), site_version: clean_(data.site_version, 80),
    unit: clean_(data.unit || "Unit 1", 40), section: clean_(data.section, 20),
    page: clean_(data.page, 100), mode: clean_(data.mode, 40),
    event_type: clean_(data.event_type || "activity", 60), activity_id: clean_(data.activity_id, 150),
    question_id: clean_(data.question_id, 80), result: clean_(data.result, 40),
    score_earned: cleanNumber_(data.score_earned), score_possible: cleanNumber_(data.score_possible),
    percent: cleanNumber_(data.percent), duration_seconds: cleanNumber_(data.duration_seconds),
    details: clean_(typeof data.details === "string" ? data.details : JSON.stringify(data.details || {}), 20000),
    client_timestamp: clean_(data.client_timestamp, 50)
  };
}

function clean_(value, max) {
  if (value === null || value === undefined) return "";
  let text = String(value).replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, max);
  if (/^[=+\-@]/.test(text)) text = "'" + text; // prevent spreadsheet formula injection
  return text;
}

function cleanNumber_(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function parseDetails_(text) {
  try { return JSON.parse(text || "{}"); } catch (_) { return {}; }
}

function requireSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" was not found.');
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function hasId_(sheet, column, id) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  return sheet.getRange(2, column, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext() !== null;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
