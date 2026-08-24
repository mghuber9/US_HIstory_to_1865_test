(() => {
  "use strict";

  const ENDPOINT = "https://script.google.com/macros/s/AKfycbx1diJO1rhei_BjKpWVMiO90_pgMMeNS7qEi6OrMN_rwjxaMhaWjqbeimaDQjK7lpXa/exec";
  const STUDENT_ID = "S1";
  const SITE_VERSION = "unit1-v3-2026-08-20";
  const UNIT = "Unit 1";
  const QUEUE_KEY = "hist1301.remoteQueue.v1";
  const SESSION_KEY = "hist1301.remoteSession.v1";
  const SESSION_STARTED_KEY = "hist1301.remoteSessionStarted.v1";
  const MAX_QUEUE = 1000;
  let flushing = false;

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }

  function sessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = uuid();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (_) {
      return `session-${uuid()}`;
    }
  }

  function readQueue() {
    try {
      const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function writeQueue(queue) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE))); }
    catch (error) { console.warn("Remote progress queue could not be saved.", error); }
  }

  function pageName() {
    const path = location.pathname.split("/").filter(Boolean);
    return path[path.length - 1] || "index.html";
  }

  function makeEvent(fields = {}) {
    return {
      event_id: fields.event_id || uuid(),
      student_id: STUDENT_ID,
      session_id: sessionId(),
      site_version: SITE_VERSION,
      unit: UNIT,
      section: fields.section || "",
      page: fields.page || pageName(),
      mode: fields.mode || "",
      event_type: fields.event_type || "activity",
      activity_id: fields.activity_id || "",
      question_id: fields.question_id || "",
      result: fields.result || "",
      score_earned: fields.score_earned ?? "",
      score_possible: fields.score_possible ?? "",
      percent: fields.percent ?? "",
      duration_seconds: fields.duration_seconds ?? "",
      details: typeof fields.details === "string" ? fields.details : JSON.stringify(fields.details || {}),
      client_timestamp: fields.client_timestamp || new Date().toISOString()
    };
  }

  function track(fields) {
    const event = makeEvent(fields);
    const queue = readQueue();
    queue.push(event);
    writeQueue(queue);
    flush();
    return event.event_id;
  }

  async function send(event) {
    // no-cors avoids Apps Script redirect/CORS response restrictions. A resolved
    // fetch means the browser transmitted the request; server Event_ID dedupe
    // makes a later retry harmless if delivery status was uncertain.
    await fetch(ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      cache: "no-store",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(event)
    });
  }

  async function flush() {
    if (flushing || !navigator.onLine) return;
    flushing = true;
    try {
      let queue = readQueue();
      while (queue.length && navigator.onLine) {
        const event = queue[0];
        try {
          await send(event);
          queue = readQueue();
          const index = queue.findIndex(item => item.event_id === event.event_id);
          if (index !== -1) queue.splice(index, 1);
          writeQueue(queue);
        } catch (_) { break; }
      }
    } finally { flushing = false; }
  }

  window.addEventListener("online", flush);
  window.addEventListener("pageshow", flush);
  window.RemoteTracker = { track, flush, makeEvent, sessionId, getQueue: readQueue, SITE_VERSION };
  let firstPage = false;
  try {
    firstPage = !sessionStorage.getItem(SESSION_STARTED_KEY);
    if (firstPage) sessionStorage.setItem(SESSION_STARTED_KEY, "1");
  } catch (_) { firstPage = true; }
  if (firstPage) track({ event_type: "session_start", mode: "navigation", details: { title: document.title } });
  else track({ event_type: "page_opened", mode: "navigation", details: { title: document.title } });
})();
