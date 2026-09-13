import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const course=JSON.parse(read('artifacts/curriculum.json'));
const catalog=JSON.parse(read('src/content/catalog.json'));
test('all 74 catalog topics have complete original lessons, no placeholders',()=>{
 assert.equal(course.lessons.length,74);
 assert.equal(new Set(course.lessons.map(l=>l.id)).size,74);
 assert.deepEqual(new Set(course.lessons.map(l=>l.id)),new Set(catalog.lessons.map(l=>l.slug)));
 assert.equal(course.lessons.filter(l=>l.kind==='case').length,32);
 assert.equal(course.groups.length,7);
 for(const l of course.lessons){
  assert.ok(l.scene.trim(),l.id+' scenario');assert.ok(l.goal.trim());
  assert.ok(l.steps.length>=3);assert.ok(l.summary.length>=3);assert.equal(l.questions.length,3);
  for(const s of l.steps){assert.ok(s.body.trim(),l.id+' explanation');assert.ok(s.path.length>=2);assert.ok(s.path.every(x=>x.trim()));}
  for(const q of l.questions){assert.equal(q.options.filter(o=>o.correct).length,1);assert.equal(q.options.length,2);assert.ok(q.options.every(o=>o.feedback.trim()),l.id+' feedback');assert.notEqual(q.options[0].feedback,q.options[1].feedback);}
  if(l.kind==='case'){
   assert.equal(l.decisions.length,5);assert.ok(l.entity&&l.api);
   for(const d of l.decisions){assert.equal(d.options.filter(o=>o.preferred).length,1);assert.notDeepEqual(d.options[0].path,d.options[1].path);assert.ok(d.options.every(o=>o.feedback.trim()),l.id+' decision explanation');assert.notEqual(d.options[0].feedback,d.options[1].feedback);}
  }else{assert.equal(l.experiment.presets.length,l.steps.length);}
 }
 assert.doesNotMatch(JSON.stringify(course),/TODO|Lorem ipsum|待补充|敬请期待|Coming soon/i);
});
test('recommended sequence respects every prerequisite and covers every lesson',()=>{
 assert.equal(course.learningOrder.length,74);assert.equal(new Set(course.learningOrder).size,74);
 for(const l of course.lessons)for(const p of l.prereqs)assert.ok(course.learningOrder.indexOf(p)<course.learningOrder.indexOf(l.id),`${p} before ${l.id}`);
});
test('export contains only inline runtime dependencies and the same curriculum',()=>{
 const html=read('index.html');assert.ok(html.startsWith('<!doctype html>'));
 assert.doesNotMatch(html,/<(?:script|link|img)[^>]+(?:src|href)\s*=\s*["']https?:/i);
 assert.doesNotMatch(html,/<(?:input|textarea|select)\b/i);
 assert.doesNotMatch(html,/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/);
 assert.doesNotMatch(html,/\/\* (?:DATA|APP|STYLES) \*\//);
 assert.deepEqual(JSON.parse(html.match(/<script id="curriculum" type="application\/json">([\s\S]*?)<\/script>/)[1]),course);
 assert.ok(html.includes("connect-src 'none'"));
});
const sandbox=vm.createContext({});vm.runInContext(read('src/experiments.js')+';globalThis.lab=fieldLabs;',sandbox);
const lab=sandbox.lab;
test('cache requests conserve hit + origin counts across changing conditions',()=>{
 lab.handle('caching','reset');lab.handle('caching','run');lab.handle('caching','cache-on');lab.handle('caching','run');
 const view=lab.render('caching');assert.match(view,/请求总数<\/span><strong>20/);assert.match(view,/数据库回源<\/span><strong>11/);assert.match(view,/缓存命中<\/span><strong>9/);
 lab.handle('caching','cache-fail');lab.handle('caching','run');assert.match(lab.render('caching'),/数据库回源<\/span><strong>21/);
});
test('queue accumulates 4000 tasks then drains with two workers',()=>{
 lab.handle('scaling-writes','reset');for(let i=0;i<10;i++)lab.handle('scaling-writes','run');assert.match(lab.render('scaling-writes'),/class="lab-big">4000</);
 lab.handle('scaling-writes','workers-2');for(let i=0;i<20;i++)lab.handle('scaling-writes','run');assert.match(lab.render('scaling-writes'),/class="lab-big">0</);
 lab.handle('scaling-writes','pause');lab.handle('scaling-writes','run');assert.match(lab.render('scaling-writes'),/处理0，积压0/);
});
test('lost update oversells with stock still zero; atomic condition sells once',()=>{
 lab.handle('ticketmaster','reset');lab.handle('ticketmaster','run');lab.handle('ticketmaster','run');assert.match(lab.render('ticketmaster'),/承诺给买家<\/span><strong class="heat">2/);
 lab.handle('ticketmaster','atomic');lab.handle('ticketmaster','run');lab.handle('ticketmaster','run');assert.match(lab.render('ticketmaster'),/承诺给买家<\/span><strong class="">1/);
});
test('consistent hashing addition moves exactly two of the twelve fixed keys',()=>{
 lab.handle('consistent-hashing','reset');assert.match(lab.render('consistent-hashing'),/3个节点，0个键迁移/);
 lab.handle('consistent-hashing','shards-4');assert.match(lab.render('consistent-hashing'),/4个节点，2个键迁移/);
});
test('CAP demo refuses coordination-dependent writes then shows AP divergence',()=>{
 lab.handle('cap-theorem','reset');lab.handle('cap-theorem','cut');lab.handle('cap-theorem','run');assert.match(lab.render('cap-theorem'),/副本 A<\/span><strong>100/);
 lab.handle('cap-theorem','available');lab.handle('cap-theorem','run');assert.match(lab.render('cap-theorem'),/副本 A<\/span><strong>80/);assert.match(lab.render('cap-theorem'),/副本 B<\/span><strong>100/);
 lab.handle('cap-theorem','heal');assert.match(lab.render('cap-theorem'),/副本 B<\/span><strong>80/);
});
