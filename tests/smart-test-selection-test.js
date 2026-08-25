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
  const sectionCounts = Object.values(test.reduce((counts, q) => { counts[q.section] = (counts[q.section] || 0) + 1; return counts; }, {}));
  if (sectionCounts.length !== 8 || Math.max(...sectionCounts) - Math.min(...sectionCounts) > 1) throw new Error(`Run ${run}: section balance failed`);
}

const ranges = ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2"];
ranges.forEach((through, rangeIndex) => {
  for (let run = 0; run < 50; run++) {
    const test = context.window.Unit1TestSelection.buildSmartTest(through);
    if (test.length !== 20) throw new Error(`${through} run ${run}: expected 20 questions`);
    if (new Set(test.map(q => q.trackingKey)).size !== 20) throw new Error(`${through} run ${run}: duplicate question`);
    if (test.some(q => Number(q.section.replace(".", "")) > Number(through.replace(".", "")))) throw new Error(`${through} run ${run}: included a later section`);
    const includedCount = rangeIndex + 1;
    const counts = Object.values(test.reduce((result, q) => { result[q.section] = (result[q.section] || 0) + 1; return result; }, {}));
    if (Math.max(...counts) - Math.min(...counts) > 1 || counts.length !== includedCount) throw new Error(`${through} run ${run}: section balance failed`);
  }
});
console.log(JSON.stringify({ defaultSmartSelections: 100, cumulativeRangeSelections: 400, questionsPerTest: 20, duplicates: 0 }));
