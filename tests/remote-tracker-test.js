const fs = require("fs");
const vm = require("vm");

function storage() {
  const values = new Map();
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}

(async () => {
  const localStorage = storage();
  const sessionStorage = storage();
  let fail = true;
  const listeners = {};
  const context = {
    window: { addEventListener: (name, fn) => { listeners[name] = fn; }, crypto: { randomUUID: (() => { let id = 0; return () => `uuid-${++id}`; })() } },
    document: { title: "Test", location: {} }, location: { pathname: "/index.html" }, navigator: { onLine: true },
    localStorage, sessionStorage, console, Date, Math, JSON, setTimeout,
    fetch: async () => { if (fail) throw new Error("offline"); return { type: "opaque" }; }
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("js/remote-tracker.js", "utf8"), context);
  await new Promise(resolve => setTimeout(resolve, 0));
  if (context.window.RemoteTracker.getQueue().length !== 1) throw new Error("Failed event was not queued");
  fail = false;
  await context.window.RemoteTracker.flush();
  if (context.window.RemoteTracker.getQueue().length !== 0) throw new Error("Successful retry was not removed");
  const event = context.window.RemoteTracker.makeEvent({ event_type: "question_answered", question_id: "q01" });
  if (!event.event_id || event.student_id !== "S1" || !event.session_id) throw new Error("Required identifiers missing");
  console.log(JSON.stringify({ offlineQueue: "passed", retry: "passed", identifiers: "passed" }));
})().catch(error => { console.error(error); process.exit(1); });
