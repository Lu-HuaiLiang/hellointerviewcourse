import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),artifact=p=>fileURLToPath(new URL('artifacts/'+p,root));
const playwright=process.env.PLAYWRIGHT_MODULE?await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE)):await import('playwright');
const options={headless:true};
if(process.env.CHROME_PATH)options.executablePath=process.env.CHROME_PATH;
else if(fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))options.executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await playwright.chromium.launch(options);
const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce',offline:true});
const page=await context.newPage();page.setDefaultTimeout(7000);
const errors=[],remote=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
const url=new URL('index.html',root).href,course=JSON.parse(fs.readFileSync(new URL('artifacts/curriculum.json',root),'utf8'));
const navigate=async id=>{await page.goto(url+'#lesson/'+id);await page.waitForFunction(id=>document.querySelector('#side-'+id)?.getAttribute('aria-current')==='page',id);};
const tab=async n=>{await page.locator('#tab-'+n).click();};
const overflow=async label=>{const sizes=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(sizes.body<=sizes.viewport+1,label+' '+JSON.stringify(sizes));};
try{
 await page.goto(url);assert.equal(await page.locator('.lesson-row').count(),74);assert.equal(await page.locator('input,textarea,select').count(),0);
 await page.screenshot({path:artifact('home-desktop.png')});
 await page.locator('#filter-case').click();assert.equal(await page.locator('.lesson-row').count(),32);await page.locator('#filter-all').click();
 for(const l of course.lessons){
  try{
   await navigate(l.id);await tab(0);assert.equal((await page.locator('.scene').textContent()).trim(),l.scene);
   await tab(1);
   for(let i=0;i<l.steps.length;i++){
    await page.locator('#step-'+i).click();
    if(l.kind==='case')for(let j=0;j<2;j++){
     await page.locator('#decision-'+j).click();assert.ok((await page.locator('.lab-copy .feedback').textContent()).includes(l.decisions[i].options[j].feedback));
     assert.equal(await page.locator('.diagram-panel svg').getAttribute('aria-label'),l.decisions[i].options[j].path.join(' → '));
    }
    else assert.equal(await page.locator('.diagram-panel svg').getAttribute('aria-label'),l.steps[i].path.join(' → '));
   }
   await tab(2);
   for(let i=0;i<3;i++){
    const right=l.questions[i].options.findIndex(o=>o.correct),wrong=1-right;
    await page.locator(`#quiz-${l.id}-${i}-option-${wrong}`).click();assert.equal(await page.locator(`#quiz-${l.id}-${i} .option.wrong`).count(),1);
    await page.locator(`#quiz-${l.id}-${i}-option-${right}`).click();assert.equal(await page.locator(`#quiz-${l.id}-${i} .option.correct`).count(),1);
   }
   await tab(3);assert.equal(await page.locator('.recap-list li').count(),3);await page.locator('#complete-lesson').click();
   await overflow(l.id);
  }catch(e){failures.push(l.id+': '+e.message);}
  if(l.index%10===0)console.log(`Checked ${l.index}/74 lessons`);
 }
 assert.deepEqual(failures,[]);
 // Persistence includes stage, selected answers, full case choices, and manual completion.
 await navigate('bitly');await tab(1);await page.locator('#step-2').click();await page.locator('#decision-0').click();await page.reload();
 assert.equal(await page.locator('#step-2').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#decision-0').getAttribute('aria-pressed'),'true');
 await tab(2);const q=course.lessons.find(l=>l.id==='bitly').questions[0],wrong=q.options.findIndex(o=>!o.correct);
 await page.locator(`#quiz-bitly-0-option-${wrong}`).click();await page.locator('#quiz-bitly-0-reveal').click();assert.equal(await page.locator('#quiz-bitly-0 .answer-key').count(),1);
 await page.locator('#quiz-bitly-0-retry').click();assert.equal(await page.locator('#quiz-bitly-0 .option.wrong').count(),0);assert.equal(await page.locator('#miss-count').textContent(),'1');
 await page.reload();assert.equal(await page.locator('#miss-count').textContent(),'1');
 await page.locator('[data-action="review"]').click();await page.locator(`#review-bitly-0-option-${1-wrong}`).click();assert.equal(await page.locator('#miss-count').textContent(),'0');
 assert.ok((await page.locator('.review-context').textContent()).includes('已纠正'));
 await navigate('caching');await tab(1);await page.locator('#experiment-cache-on').click();await page.locator('#experiment-run').click();assert.ok((await page.locator('.sim-log').textContent()).includes('回源1次'));
 await page.locator('.hands-on').scrollIntoViewIfNeeded();await page.screenshot({path:artifact('experiment-desktop.png')});
 // Desktop lesson screenshot without retaining a scrolled viewport.
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:artifact('caching-desktop.png'),fullPage:true});
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  await page.goto(url+'#home');await overflow('home '+width);
  await page.locator('#menu-toggle').click();assert.equal(await page.locator('#menu-toggle').getAttribute('aria-expanded'),'true');await page.locator('#menu-toggle').click();
  for(const id of ['caching','consistent-hashing','ticketmaster','robinhood','chatgpt','spotify-data-lake-point-queries']){
   await navigate(id);for(const n of [0,1,2,3]){await tab(n);await overflow(id+' tab '+n+' width '+width);}
  }
  if(width===390){await page.goto(url+'#home');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:artifact('home-mobile.png'),fullPage:true});await navigate('caching');await tab(1);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:artifact('caching-mobile.png'),fullPage:true});}
 }
 await navigate('caching');await tab(0);await page.locator('#tab-0').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#tab-1').getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-1');
 await page.goto(url+'#lesson/unknown');assert.equal(await page.locator('.hero').count(),1);
 assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
 // A denied storage backend should preserve a usable in-memory course.
 const denied=await browser.newContext({offline:true});await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
 const dp=await denied.newPage();await dp.goto(url);assert.equal(await dp.locator('#storage-notice').isVisible(),true);await dp.locator('.hero [data-action="lesson"]').click();await dp.locator('#tab-2').click();await dp.locator('.option').first().click();assert.equal(await dp.locator('.feedback').count(),1);await denied.close();
 const corrupted=await browser.newContext({offline:true});await corrupted.addInitScript(()=>{localStorage.setItem('system-design-fieldnotes-v1',JSON.stringify({version:1,last:'caching',lessons:{caching:{tab:999,step:-10,answers:{0:{selected:999}},decisions:null}}}));});
 const cp=await corrupted.newPage();await cp.goto(url+'#lesson/caching');assert.equal(await cp.locator('.scene').count(),1);await corrupted.close();
 const report={passed:true,lessons:74,cases:32,questions:222,decisionOptions:320,viewports:[1440,768,390,320],offline:true,remoteRequests:remote.length,runtimeErrors:errors.length,checks:['full catalog navigation','all scenario and step states','all case alternative paths','all quiz right/wrong feedback','progress reload','wrong-answer review and retry','denied and malformed storage','keyboard tabs','mobile overflow','deterministic experiment','unknown route fallback']};
 fs.writeFileSync(artifact('browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
