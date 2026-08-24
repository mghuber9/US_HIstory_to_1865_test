const fs = require("fs");
const vm = require("vm");

const elements = new Map();
function element() { return { classList: { add() {}, remove() {} }, set onclick(value) { this._onclick = value; }, get onclick() { return this._onclick; } }; }
const context = {
  window: { UNIT1_SECTIONS: {}, HistProgress: { questionKey: (s, q) => `${s}:${q}`, getUnitData: () => ({ questions: {}, testAttempts: [] }) } },
  document: { getElementById: id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); } },
  location: { href: "" }, confirm: () => true, Math, Date, Object, Array, Set, String, Number
};
vm.createContext(context);
for (const file of fs.readdirSync("data").filter(name => name.endsWith(".js")).sort()) vm.runInContext(fs.readFileSync(`data/${file}`, "utf8"), context);
vm.runInContext(fs.readFileSync("js/test.js", "utf8"), context);
for (let run = 0; run < 100; run++) {
  const test = context.window.Unit1TestSelection.buildSmartTest();
  if (test.length !== 20) throw new Error(`Run ${run}: expected 20 questions`);
  if (new Set(test.map(q => q.trackingKey)).size !== 20) throw new Error(`Run ${run}: duplicate question`);
  const chapters = test.reduce((counts, q) => { const chapter = q.section.split(".")[0]; counts[chapter] = (counts[chapter] || 0) + 1; return counts; }, {});
  if (["1","2","3","4"].some(chapter => chapters[chapter] !== 5)) throw new Error(`Run ${run}: chapter balance failed`);
}
console.log(JSON.stringify({ smartSelections: 100, questionsPerTest: 20, questionsPerChapter: 5, duplicates: 0 }));
