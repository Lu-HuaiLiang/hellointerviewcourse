import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),artifact=p=>fileURLToPath(new URL('artifacts/'+p,root));
const playwright=process.env.PLAYWRIGHT_MODULE?await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE)):await import('playwright');
const options={headless:true};
if(process.env.CHROME_PATH)options.executablePath=process.env.CHROME_PATH;
else if(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))options.executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await playwright.chromium.launch(options);
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',offline:true});
const page=await context.newPage();page.setDefaultTimeout(5000);
const errors=[],remote=[],failures=[],report={lessons:0,caseAlternatives:0,questions:0,widths:[],migration:[],passed:false};
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
const url=new URL('index.html',root).href,course=JSON.parse(fs.readFileSync(new URL('artifacts/curriculum.json',root),'utf8'));
const navigate=async id=>{await page.goto(url+'#lesson/'+id);await page.waitForSelector('#heading-principle');};
const section=async id=>page.locator('#nav-'+id).click();
const overflow=async(label,p=page)=>{const sizes=await p.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(sizes.body<=sizes.viewport+1,label+' '+JSON.stringify(sizes));};
try{
 await page.goto(url);assert.equal(await page.locator('.lesson-row').count(),74);
 await page.screenshot({path:artifact('home-desktop.png')});
 await page.locator('#filter-case').click();assert.equal(await page.locator('.lesson-row').count(),32);await page.locator('#filter-all').click();
 for(const l of course.lessons){
  try{
   await navigate(l.id);
   assert.equal(await page.locator('[role="tablist"]').count(),0);
   assert.equal(await page.locator('.reading-section').count(),7);
   assert.equal(await page.locator('#section-check').getAttribute('open'),null);
   assert.equal(await page.locator('#section-principle dt').count(),2);
   const paragraphs=l.reading.sections.find(s=>s.id==='principle').blocks.filter(b=>b.type==='paragraph');
   for(const b of paragraphs)assert.ok((await page.locator('#section-principle').textContent()).includes(b.text));
   assert.ok((await page.locator('#section-example').textContent()).includes(l.reading.sections.find(s=>s.id==='example').blocks[0].paragraphs[0]));
   assert.ok((await page.locator('#section-boundary').textContent()).includes(l.reading.sections.find(s=>s.id==='boundary').blocks[0].text));
   assert.equal(await page.locator('.reading-figure').count(),l.steps.length);
   await section('explore');
   if(l.kind==='case')assert.ok((await page.locator('#explore-path .feedback').textContent()).includes(l.decisions[0].options.find(o=>o.preferred).feedback));
   // Keep references to prove interactions update locally, rather than remount the article.
   await page.evaluate(()=>{window.originalParagraph=document.querySelector('#section-principle');window.originalNav=document.querySelector('.reading-nav');});
   for(let i=0;i<l.steps.length;i++){
    await page.locator('#step-'+i).click();
    if(l.kind==='case')for(let j=0;j<2;j++){
     await page.locator('#decision-'+j).click();
     assert.ok((await page.locator('#explore-path .feedback').textContent()).includes(l.decisions[i].options[j].feedback));
     assert.equal(await page.locator('#explore-path svg').getAttribute('aria-label'),l.decisions[i].options[j].path.join(' → '));report.caseAlternatives++;
    }
    else assert.equal(await page.locator('#explore-path svg').getAttribute('aria-label'),l.steps[i].path.join(' → '));
   }
   assert.equal(await page.evaluate(()=>originalParagraph===document.querySelector('#section-principle')&&originalNav===document.querySelector('.reading-nav')),true);
   await page.locator('#reset-path').click();assert.equal(await page.locator('#step-0').getAttribute('aria-pressed'),'true');
   await section('takeaway');assert.equal(await page.locator('.recap-list li').count(),3);
   await page.locator('#complete-lesson').click();assert.match(await page.locator('#complete-lesson').textContent(),/已标记完成/);
   // Completion and knowledge access do not require a single answer.
   const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('system-design-fieldnotes-v2')).lessons[id],l.id);
   assert.equal(Object.keys(saved.answers).length,0);assert.equal(saved.complete,true);
   await section('check');
   for(let i=0;i<3;i++){
    const right=l.questions[i].options.findIndex(o=>o.correct),wrong=1-right;
    await page.locator(`#quiz-${l.id}-${i}-option-${wrong}`).click();assert.equal(await page.locator(`#quiz-${l.id}-${i} .option.wrong`).count(),1);
    await page.locator(`#quiz-${l.id}-${i}-reveal`).click();assert.equal(await page.locator(`#quiz-${l.id}-${i} .answer-key`).count(),1);
    await page.locator(`#quiz-${l.id}-${i}-option-${right}`).click();assert.equal(await page.locator(`#quiz-${l.id}-${i} .option.correct`).count(),1);report.questions++;
   }
   await overflow(l.id);report.lessons++;
  }catch(e){failures.push(l.id+': '+e.message);}
  if(l.index%10===0)console.log(`Checked ${l.index}/74 lessons`);
 }
 assert.deepEqual(failures,[]);
 // Progress and chosen case path survive refresh. Reading position replaces tab gating.
 await navigate('bitly');await section('explore');await page.locator('#step-2').click();await page.locator('#decision-0').click();await page.reload();
 assert.equal(await page.locator('#step-2').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#decision-0').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#complete-lesson').textContent(),'已标记完成 ✓');
 await section('check');const q=course.lessons.find(l=>l.id==='bitly').questions[0],wrong=q.options.findIndex(o=>!o.correct);
 await page.locator(`#quiz-bitly-0-option-${wrong}`).click();await page.locator('#quiz-bitly-0-retry').click();assert.equal(await page.locator('#miss-count').textContent(),'1');
 await page.reload();assert.equal(await page.locator('#miss-count').textContent(),'1');
 await page.locator('[data-action="review"]').click();await page.locator(`#review-bitly-0-option-${1-wrong}`).click();assert.equal(await page.locator('#miss-count').textContent(),'0');assert.match(await page.locator('.review-context').textContent(),/已纠正/);
 // Sliders are not destroyed during input and preserve keyboard focus.
 await navigate('caching');await section('explore');await page.locator('#experiment-reset').click();await page.locator('#experiment-cache-on').click();
 await page.locator('#range-rate').focus();await page.evaluate(()=>window.originalRange=document.querySelector('#range-rate'));
 await page.keyboard.press('Home');assert.equal(await page.locator('#range-rate').inputValue(),'0');
 await page.keyboard.press('End');assert.equal(await page.locator('#range-rate').inputValue(),'100');
 assert.equal(await page.evaluate(()=>originalRange===document.activeElement&&originalRange===document.querySelector('#range-rate')),true);
 await page.locator('#experiment-run').click();assert.match(await page.locator('.sim-log').textContent(),/回源0次/);
 const position=await page.evaluate(()=>scrollY);await page.locator('#experiment-run').click();assert.ok(Math.abs(await page.evaluate(()=>scrollY)-position)<5,'experiment button unexpectedly moves viewport');
 await page.locator('#experiment-cache-fail').click();await page.locator('#experiment-run').click();assert.match(await page.locator('.sim-log').textContent(),/回源100次/);
 await page.locator('.hands-on').scrollIntoViewIfNeeded();await page.screenshot({path:artifact('experiment-desktop.png')});
 await section('scene');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:artifact('caching-desktop.png')});
 await section('principle');await page.screenshot({path:artifact('concept-desktop.png')});
 await navigate('youtube');await section('explore');await page.locator('#experiment-run').click();await page.locator('#experiment-fail').click();assert.match(await page.locator('.sim-log').textContent(),/转码失败/);assert.match(await page.locator('.hands-visual').textContent(),/尚未发布/);
 await page.locator('#experiment-run').click();await page.locator('#experiment-run').click();await page.locator('#experiment-run').click();assert.match(await page.locator('.hands-visual').textContent(),/公开可读/);
 await page.locator('.hands-on').scrollIntoViewIfNeeded();await page.screenshot({path:artifact('youtube-desktop.png')});
 // Text, controls and diagrams at phone and tablet widths, across all lessons.
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});await page.goto(url+'#home');await overflow('home '+width);
  await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'false');
  for(const l of course.lessons){await navigate(l.id);await overflow(l.id+' '+width);}
  await navigate('caching');await section('principle');await page.screenshot({path:artifact(`reading-${width}.png`)});
  await section('explore');await page.locator('#experiment-cache-on').click();await page.locator('#range-rate').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#range-rate').inputValue(),'1');
  await page.locator('.hands-on').scrollIntoViewIfNeeded();await page.screenshot({path:artifact(`experiment-${width}.png`)});
  report.widths.push(width);console.log('Checked mobile width '+width);
 }
 // v1 migration: every tab maps to an accessible reading section, without losing data.
 for(const tab of [0,1,2,3]){
  const ctx=await browser.newContext({offline:true,viewport:{width:1200,height:900}});
  await ctx.addInitScript(({tab})=>{if(!localStorage.getItem('system-design-fieldnotes-v2'))localStorage.setItem('system-design-fieldnotes-v1',JSON.stringify({version:1,last:'bitly',lessons:{bitly:{tab,step:2,complete:true,decisions:{2:0},answers:{0:{selected:0,wrong:true,revealed:true,attempts:2}}}}}));},{tab});
  const p=await ctx.newPage();await p.goto(url+'#lesson/bitly');await p.waitForSelector('#heading-principle');
  const data=await p.evaluate(()=>JSON.parse(localStorage.getItem('system-design-fieldnotes-v2')));
  assert.equal(data.version,2);const s=data.lessons.bitly;assert.equal(s.step,2);assert.equal(s.complete,true);assert.equal(s.decisions[2],0);assert.equal(s.answers[0].attempts,2);
  // Observer may refine current position after restore; the requested section is visible at the landing position.
  const expected=['scene','explore','check','takeaway'][tab];
  await p.waitForFunction(expected=>JSON.parse(localStorage.getItem('system-design-fieldnotes-v2')).lessons.bitly.section===expected,expected);
  await p.reload();await p.waitForSelector('#heading-principle');
  await p.waitForFunction(expected=>JSON.parse(localStorage.getItem('system-design-fieldnotes-v2')).lessons.bitly.section===expected,expected);
  if(tab===2)assert.notEqual(await p.locator('#section-check').getAttribute('open'),null);
  else if(tab!==0){const rect=await p.locator('#section-'+expected).boundingBox();assert.ok(rect.y>=0&&rect.y<250,'migration scroll '+expected);}
  assert.ok(await p.evaluate(()=>!!localStorage.getItem('system-design-fieldnotes-v1')),'keep old storage until migration succeeds');
  report.migration.push(tab);await ctx.close();
 }
 // Bad storage never blocks the curriculum; persistence failures are visible.
 for(const mode of ['corrupt','denied','malformed']){
  const ctx=await browser.newContext({offline:true});await ctx.addInitScript(mode=>{
   if(mode==='denied'){Storage.prototype.setItem=function(){throw new Error('denied');};Storage.prototype.getItem=function(){throw new Error('denied');};}
   else localStorage.setItem('system-design-fieldnotes-v2',mode==='corrupt'?'not json':JSON.stringify({version:2,last:'missing',lessons:{caching:{section:'unknown',step:900,answers:{0:{selected:99,attempts:-1}},complete:'yes'}}}));
  },mode);
  const p=await ctx.newPage();await p.goto(url+'#lesson/caching');await p.waitForSelector('#heading-principle');assert.equal(await p.locator('.reading-section').count(),7);
  if(mode!=='malformed')assert.equal(await p.locator('#storage-notice').isVisible(),true);
  await p.locator('#nav-takeaway').click();await p.locator('#complete-lesson').click();assert.match(await p.locator('#complete-lesson').textContent(),/已标记完成/);await ctx.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);report.passed=true;
 console.log(JSON.stringify(report));
}finally{
 report.errors=errors;report.failures=failures;report.remoteRequests=remote;fs.writeFileSync(artifact('browser-report.json'),JSON.stringify(report,null,2));await browser.close();
}
