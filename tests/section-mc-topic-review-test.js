const fs = require("fs");
const vm = require("vm");

const context = { window: { UNIT1_SECTIONS: {} }, console };
vm.createContext(context);
for (const file of fs.readdirSync("data").filter(name => /^\d-\d\.js$/.test(name)).sort()) {
  vm.runInContext(fs.readFileSync(`data/${file}`, "utf8"), context);
}
vm.runInContext(fs.readFileSync("data/course-data.js", "utf8"), context);
Object.values(context.window.UNIT1_SECTIONS).forEach(section => {
  section.unit = 1;
  context.window.ALL_SECTIONS[`1-${section.id}`] = section;
});
vm.runInContext(fs.readFileSync("js/topics.js", "utf8"), context);

const errors = [];
const sections = [...new Set(Object.values(context.window.ALL_SECTIONS))];
for (const section of sections) {
  for (const question of section.questions) {
    const topic = section.topicEntries.find(entry => entry.topic === question.topic);
    if (!topic) errors.push(`Missing topic for ${section.id}:${question.id}`);
    if (topic && !topic.concepts.some(concept => concept.id === question.id)) {
      errors.push(`Question absent from topic list ${section.id}:${question.id}`);
    }
  }
}

const app = fs.readFileSync("js/app.js", "utf8");
const test = fs.readFileSync("js/test.js", "utf8");
if (!app.includes('state.checked ? feedbackHtml(q, context) : ""')) errors.push("Post-answer rendering guard missing");
if (!app.includes('context === "mc" ? topicReviewHtml(q) : ""')) errors.push("Section-MC-only guard missing");
if (!app.includes('class="topic-study-review"')) errors.push("Topic review markup missing");
if (test.includes("topic-study-review")) errors.push("Active Test Mode contains section topic-review markup");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ sections: sections.length, questions: sections.reduce((n, s) => n + s.questions.length, 0), preAnswerGuard: "passed", postAnswerTopicCoverage: "complete", activeTestExposure: "none" }));
