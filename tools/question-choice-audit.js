#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function loadBank() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  const unit1Files = ['1-1.js','1-2.js','2-1.js','2-2.js','3-1.js','3-2.js','4-1.js','4-2.js'];
  for (const file of unit1Files) {
    vm.runInContext(fs.readFileSync(path.join(ROOT,'data',file),'utf8'), ctx, {filename:file});
    if (ctx.window.SECTION_DATA) {
      ctx.window.UNIT1_SECTIONS = ctx.window.UNIT1_SECTIONS || {};
      ctx.window.UNIT1_SECTIONS[ctx.window.SECTION_DATA.id] = ctx.window.SECTION_DATA;
      delete ctx.window.SECTION_DATA;
    }
  }
  vm.runInContext(fs.readFileSync(path.join(ROOT,'data','course-data.js'),'utf8'), ctx, {filename:'course-data.js'});
  return Object.values(ctx.window.ALL_SECTIONS || {}).sort((a,b)=>a.unit-b.unit || a.id.localeCompare(b.id,undefined,{numeric:true}));
}

const words = s => (String(s).match(/[A-Za-z0-9À-ÖØ-öø-ÿ’'-]+/g) || []);
const wc = s => words(s).length;
const charCount = s => String(s).replace(/\s+/g,' ').trim().length;
const specificity = s => {
  const toks = words(s);
  const numbers = (String(s).match(/\b\d{3,4}\b/g)||[]).length;
  const proper = toks.slice(1).filter(t => /^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ’'-]+$/.test(t)).length;
  const qualifiers = toks.filter(t => /^(primarily|directly|eventually|especially|mainly|chiefly|most)$/i.test(t)).length;
  return numbers*2 + proper + qualifiers;
};
const shape = s => {
  const t=String(s).trim();
  if (/^(It|He|She|They|This|That|Its|Their|His|Her)\b/i.test(t)) return 'clause';
  if (/^(A|An|The)\b/i.test(t)) return 'article-phrase';
  if (/^\d/.test(t)) return 'date/number';
  if (/[.!?]$/.test(t)) return 'sentence';
  return 'phrase';
};

function audit() {
  const sections = loadBank();
  const rows=[];
  const patternCounts = new Map();
  let total=0;
  for(const s of sections) for(const q of (s.questions||[])) {
    total++;
    const lens=q.choices.map(wc), chars=q.choices.map(charCount), specs=q.choices.map(specificity), shapes=q.choices.map(shape);
    const ci=q.answer, correct=lens[ci], distract=lens.filter((_,i)=>i!==ci);
    const avg=distract.reduce((a,b)=>a+b,0)/distract.length;
    const flags=[];
    if(correct>=6 && correct >= avg*1.5) flags.push('correct-much-longer');
    if(correct>=7 && Math.max(...distract)<=3) flags.push('short-distractors');
    if(distract.some(n=>n<=Math.max(2,correct*0.35)) && correct>=7) flags.push('very-short-distractor');
    const otherShapes=shapes.filter((_,i)=>i!==ci);
    if(new Set(otherShapes).size===1 && otherShapes[0]!==shapes[ci]) flags.push('grammar/structure-mismatch');
    const otherSpec=specs.filter((_,i)=>i!==ci).reduce((a,b)=>a+b,0)/3;
    if(specs[ci] >= otherSpec+3) flags.push('correct-more-specific');
    q.choices.forEach((c,i)=>{
      const normalized=String(c).toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' ]/g,' ').replace(/\s+/g,' ').trim();
      for(const p of ['it was primarily associated with','primarily','most directly','eventually']) {
        if(normalized.includes(p)) {
          const key=p; if(!patternCounts.has(key)) patternCounts.set(key,{correct:0,distractor:0});
          patternCounts.get(key)[i===ci?'correct':'distractor']++;
        }
      }
    });
    if(flags.length) rows.push({unit:s.unit,section:s.id,id:q.id,style:q.style||'legacy',question:q.q,answer:q.answer,wordLengths:lens,charLengths:chars,specificity:specs,shapes,flags});
  }
  const byUnit={};
  for(const s of sections){byUnit[s.unit]=byUnit[s.unit]||{sections:0,questions:0,flagged:0};byUnit[s.unit].sections++;byUnit[s.unit].questions+=(s.questions||[]).length;}
  for(const r of rows) byUnit[r.unit].flagged++;
  return {totalQuestions:total,totalFlagged:rows.length,byUnit,patterns:Object.fromEntries(patternCounts),flags:rows};
}

const result=audit();
if(process.argv.includes('--json')) console.log(JSON.stringify(result,null,2));
else {
  console.log(`Questions examined: ${result.totalQuestions}`);
  console.log(`Questions with one or more heuristic cue flags: ${result.totalFlagged}`);
  for(const [u,v] of Object.entries(result.byUnit)) console.log(`Unit ${u}: ${v.questions} questions, ${v.flagged} flagged`);
  console.log('Repeated wording patterns:', JSON.stringify(result.patterns));
  const counts={}; for(const r of result.flags) for(const f of r.flags) counts[f]=(counts[f]||0)+1;
  console.log('Flag counts:', JSON.stringify(counts));
}
