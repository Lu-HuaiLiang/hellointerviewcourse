import fs from 'node:fs';
import {parseReadingNotes,attachReading,validateReading} from '../src/content/reading.mjs';
import {exportNotes} from './export-notes.mjs';
const notes=parseReadingNotes(fs.readFileSync(new URL('../src/content/reading-notes.txt',import.meta.url),'utf8'));
import {groups,sources} from '../src/content/helpers.mjs';
import foundations from '../src/content/foundations.mjs';
import toolsPatterns from '../src/content/tools-patterns.mjs';
const extras=[];
for(const name of ['advanced','cases-a','cases-b'])extras.push(...(await import(`../src/content/${name}.mjs`)).default);
const catalog=JSON.parse(fs.readFileSync(new URL('../src/content/catalog.json',import.meta.url),'utf8'));
const list=[...foundations,...toolsPatterns,...extras];
const order=new Map(groups.map((g,i)=>[g.id,i]));
list.sort((a,b)=>order.get(a.group)-order.get(b.group));
const lessons=list.map((l,i)=>{
 const entry=catalog.lessons.find(c=>c.slug===l.id);
 if(!entry)throw new Error('No source catalog entry for '+l.id);
 return attachReading({...l,index:i+1,en:entry.title,source:entry.url,refs:l.refs.map(key=>{if(!sources[key])throw Error('Unknown source '+key);return sources[key];})},notes.get(l.id));
});
if(lessons.length!==catalog.lessons.length)throw Error('Curriculum is incomplete');
const learningOrder=[],visiting=new Set(),visited=new Set();
function visit(id){if(visited.has(id))return;if(visiting.has(id))throw Error('Prerequisite cycle: '+id);const l=lessons.find(x=>x.id===id);if(!l)throw Error('Missing prerequisite '+id);visiting.add(id);l.prereqs.forEach(visit);visiting.delete(id);visited.add(id);learningOrder.push(id);}
lessons.forEach(l=>visit(l.id));
validateReading(lessons,notes);
const payload={version:2,date:catalog.date,groups,lessons,learningOrder};
const data=JSON.stringify(payload).replace(/</g,'\\u003c');
let shell=fs.readFileSync(new URL('../src/shell.html',import.meta.url),'utf8');
for(const [marker,content] of [['/* STYLES */',fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8')],['/* DATA */',data],['/* APP */',fs.readFileSync(new URL('../src/experiments.js',import.meta.url),'utf8')+'\n'+fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8')]]){
 if(!shell.includes(marker))throw Error('Missing build marker '+marker);
 shell=shell.replace(marker,()=>content);
}
fs.writeFileSync(new URL('../index.html',import.meta.url),shell);
fs.writeFileSync(new URL('../artifacts/curriculum.json',import.meta.url),JSON.stringify(payload,null,2));
exportNotes(payload);
console.log(`Built ${lessons.length}/${catalog.lessons.length} lessons; ${lessons.filter(l=>l.kind==='case').length} cases; ${Buffer.byteLength(shell)} bytes.`);
