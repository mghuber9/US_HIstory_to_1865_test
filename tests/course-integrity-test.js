const fs=require('fs'),vm=require('vm'),path=require('path');
const context={window:{UNIT1_SECTIONS:{}},console};vm.createContext(context);
for(const f of fs.readdirSync('data').filter(x=>/^\d-\d\.js$/.test(x)).sort())vm.runInContext(fs.readFileSync(path.join('data',f),'utf8'),context);
vm.runInContext(fs.readFileSync('data/course-data.js','utf8'),context);
Object.values(context.window.UNIT1_SECTIONS).forEach(s=>{s.unit=1;context.window.ALL_SECTIONS['1-'+s.id]=s});
vm.runInContext(fs.readFileSync('js/topics.js','utf8'),context);
const sections=Object.values(context.window.ALL_SECTIONS),newSections=sections.filter(s=>s.unit>1),ids=new Set(),errors=[];
for(const s of sections){if(!s.id||!s.title||!Array.isArray(s.learnScreens)||!Array.isArray(s.questions))errors.push(`Malformed section ${s.id}`);const cfu=new Set(s.learnScreens.flatMap(x=>x.cfu||[]));const covered=new Set(s.learnScreens.flatMap(x=>(x.concepts||[]).map(c=>c.id)));for(const q of s.questions){const key=`${s.unit}:${s.id}:${q.id}`;if(ids.has(key))errors.push(`Duplicate ${key}`);ids.add(key);if(!Array.isArray(q.choices)||q.choices.length!==4||q.answer<0||q.answer>3||!q.choices[q.answer])errors.push(`Malformed ${key}`);if(s.unit>1&&!cfu.has(q.id))errors.push(`Question absent from Learn checks ${key}`);if(!covered.has(q.id))errors.push(`Question absent from topic study coverage ${key}`)}for(const topic of s.learnScreens){if(!topic.body||!(topic.concepts||[]).length)errors.push(`Incomplete topic ${s.unit}:${s.id}:${topic.title}`);for(const concept of topic.concepts){if(!topic.searchText.includes(context.window.HistTopics.normalize(concept.answer)))errors.push(`Answer not searchable ${s.unit}:${s.id}:${concept.id}`)}}}
for(const f of fs.readdirSync('sections').filter(x=>x.endsWith('.html'))){const text=fs.readFileSync(path.join('sections',f),'utf8');for(const m of text.matchAll(/(?:href|src)="([^"#]+)"/g)){if(/^(https?:|data:)/.test(m[1]))continue;const target=path.resolve('sections',m[1]);if(!fs.existsSync(target))errors.push(`Broken link ${f} -> ${m[1]}`)}}
if(newSections.length!==18)errors.push(`Expected 18 new sections, got ${newSections.length}`);
if(newSections.reduce((n,s)=>n+s.questions.length,0)!==360)errors.push('Expected 360 new questions');
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify({sections:sections.length,newSections:newSections.length,newQuestions:360,uniqueQuestionKeys:ids.size,brokenLinks:0,malformedQuestions:0,learnCheckCoverage:'complete'}));
