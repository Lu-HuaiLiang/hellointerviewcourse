(()=>{
'use strict';
const course=JSON.parse(document.getElementById('curriculum').textContent);
const lessons=course.lessons, byId=new Map(lessons.map(l=>[l.id,l]));
const key='system-design-fieldnotes-v2',legacyKey='system-design-fieldnotes-v1';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const N=n=>String(n).padStart(2,'0');
let state={version:2,last:null,lessons:{}},storageOK=true,filter='all',reviewSnapshot=[],openGroups=new Set(['start']);
try{
 const raw=JSON.parse(localStorage.getItem(key)||localStorage.getItem(legacyKey)||'null');
 if(raw&&[1,2].includes(raw.version)&&raw.lessons&&typeof raw.lessons==='object'){
  state.last=byId.has(raw.last)?raw.last:null;
  for(const lesson of lessons){
   const s=raw.lessons[lesson.id];if(!s||typeof s!=='object')continue;
   const clean={section:['scene','principle','walkthrough','example','explore','boundary','takeaway','check'].includes(s.section)?s.section:raw.version===1?['scene','explore','check','takeaway'][s.tab]||'scene':'scene',tab:Number.isInteger(s.tab)&&s.tab>=0&&s.tab<4?s.tab:0,step:Number.isInteger(s.step)&&s.step>=0&&s.step<lesson.steps.length?s.step:0,answers:{},decisions:{},complete:s.complete===true};
   lesson.questions.forEach((q,i)=>{const a=s.answers?.[i];if(a&&typeof a==='object'){
    const selected=Number.isInteger(a.selected)&&q.options[a.selected]?a.selected:null;
    clean.answers[i]={selected,revealed:a.revealed===true,wrong:a.wrong===true,attempts:Number.isSafeInteger(a.attempts)&&a.attempts>0?a.attempts:0};
   }});
   lesson.decisions?.forEach((d,i)=>{if(Number.isInteger(s.decisions?.[i])&&d.options[s.decisions[i]])clean.decisions[i]=s.decisions[i];});
   state.lessons[lesson.id]=clean;
  }
 }
 localStorage.setItem(key,JSON.stringify(state));
}catch{storageOK=false;}
const getState=l=>state.lessons[l.id]||(state.lessons[l.id]={section:'scene',tab:0,step:0,answers:{},decisions:{},complete:false});
const save=()=>{if(storageOK)try{localStorage.setItem(key,JSON.stringify(state));}catch{storageOK=false;}document.getElementById('storage-notice').hidden=storageOK;};
const misses=()=>lessons.flatMap(l=>l.questions.map((q,i)=>({l,q,i,a:state.lessons[l.id]?.answers?.[i]}))).filter(x=>x.a?.wrong);
const completed=()=>lessons.filter(l=>state.lessons[l.id]?.complete).length;
let route={view:'home',id:null};
function readRoute(){
 let h;try{h=decodeURIComponent(location.hash.slice(1));}catch{h='home';}
 if(h.startsWith('lesson/')&&byId.has(h.slice(7)))return {view:'lesson',id:h.slice(7)};
 if(h==='review')return {view:'review',id:null};
 return {view:'home',id:null};
}
function go(view,id){const hash=view==='lesson'?`lesson/${id}`:view;if(location.hash==='#'+hash){route=readRoute();render();window.scrollTo({top:0,behavior:'instant'});}else location.hash=hash;}
function announce(s){document.getElementById('announcer').textContent=s;}
function btn(action,text,extra='',cls='',id=''){return `<button data-action="${action}" ${extra} class="${cls}" ${id?`id="${id}"`:''}>${text}</button>`;}
function footer(){return `<footer class="page-footer"><span>LEARN & THINK / 系统设计互动札记</span><span>原创中文讲解 · 主题目录 ${course.date} · 离线可用</span></footer>`;}
function renderSidebar(){
 const el=document.getElementById('sidebar'),scroll=el.scrollTop;
 const current=byId.get(route.id);if(current)openGroups.add(current.group);
 el.innerHTML=`${btn('home','课程总览 <span aria-hidden="true">↗</span>','',`side-home ${route.view==='home'?'active':''}`)}
 <div class="side-progress"><p><span>你的学习进度</span><span>${completed()} / ${lessons.length}</span></p><div class="track" role="progressbar" aria-label="已完成课程" aria-valuenow="${completed()}" aria-valuemin="0" aria-valuemax="${lessons.length}"><span style="width:${completed()/lessons.length*100}%"></span></div></div>
 ${course.groups.map((g,gi)=>`<details class="side-group" data-group="${g.id}" ${openGroups.has(g.id)?'open':''}><summary>${N(gi+1)} / ${E(g.title)} <span>${lessons.filter(l=>l.group===g.id).length} ＋</span></summary>${lessons.filter(l=>l.group===g.id).map(l=>btn('lesson',`<span class="num">${N(l.index)}</span><span>${E(l.title)}</span><span class="check">${state.lessons[l.id]?.complete?'✓':''}</span>`,`data-id="${l.id}" ${route.id===l.id?'aria-current="page"':''}`,`side-lesson ${route.id===l.id?'active':''}`,`side-${l.id}`)).join('')}</details>`).join('')}
 <p class="side-foot">不必一次学完。<br>每次，想明白一个问题。</p>`;
 el.scrollTop=scroll;
 document.getElementById('miss-count').textContent=misses().length;
}
function heroArt(){return `<svg viewBox="0 0 320 260" role="img" aria-label="从用户请求到服务，再到缓存和数据库的示意图"><defs><marker id="hero-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10" fill="none" stroke="#7dc8b1"/></marker></defs><g stroke="#7dc8b1" fill="none" stroke-width="1.2"><path d="M160 49V93M160 139V169H69V192M160 169H251V192" marker-end="url(#hero-arrow)"/><circle cx="160" cy="30" r="19"/><path d="M153 34q7 -12 14 0M160 23v3"/><rect x="93" y="94" width="134" height="45"/><rect x="17" y="194" width="105" height="45"/><path d="M209 205c0-18 85-18 85 0v31c0 17-85 17-85 0zM209 205c0 17 85 17 85 0"/></g><g fill="#f5f3ee" font-family="ui-monospace,monospace" text-anchor="middle" font-size="13"><text x="160" y="122">SERVICE</text><text x="69" y="221">CACHE</text><text x="252" y="232">DATABASE</text></g><text x="177" y="69" fill="#7dc8b1" font-family="ui-monospace,monospace" font-size="10">one request</text><circle cx="160" cy="78" r="3.5" fill="#e36f3c"/><circle cx="69" cy="180" r="3" fill="#a8ead5"/></svg>`;}
function home(){
 const resume=state.last&&byId.get(state.last);const first=resume||lessons[0];
 return `<div class="page"><div class="breadcrumb"><span>一本可以动手的系统设计教材</span><span class="eyebrow">FIELDNOTES / VOL. 01</span></div>
 <section class="hero"><div class="hero-visual"><p class="eyebrow">THINK IN SYSTEMS</p>${heroArt()}<p class="visual-note">从一次请求开始。<br>理解每一条连线，<br>和它背后的选择。</p></div><div class="hero-copy"><p class="eyebrow">AN INTERACTIVE LEARNING JOURNEY</p><h1>把系统设计，<br><em>真正想明白。</em></h1><p class="dek">读懂一个概念，再亲手验证它。<br>沿着例子与图解，把为什么讲清楚。</p>${btn('lesson',`${resume?'继续上次学习':'从第一课开始'} <span aria-hidden="true">↗</span>`,`data-id="${first.id}"`,'primary')}<p class="tiny">${resume?E(resume.title):'概念讲解 · 图解推导 · 动手实验 · 自由阅读'}</p></div></section>
 <div class="course-strip"><div><strong>${N(lessons.length)}</strong> 个完整主题</div><div><strong>${N(lessons.filter(l=>l.kind==='case').length)}</strong> 个设计案例</div><div><strong>${N(completed())}</strong> 个已完成</div></div>
 <section aria-labelledby="directory-title"><div class="section-heading"><div><p class="eyebrow">YOUR LEARNING MAP</p><h2 id="directory-title">循着问题，慢慢深入。</h2></div><p>按顺序学习，或自由翻阅。</p></div>
 <div class="filters" role="group" aria-label="按课程分组筛选">${[{id:'all',title:'全部主题'},...course.groups].map(g=>btn('filter',E(g.title),`data-group="${g.id}" aria-pressed="${filter===g.id}"`,'filter',`filter-${g.id}`)).join('')}</div>
 ${course.groups.filter(g=>filter==='all'||g.id===filter).map(g=>`<section class="directory-group"><div class="group-label"><strong>${N(course.groups.indexOf(g)+1)}</strong><span>${E(g.title)}</span><span class="en">${E(g.en)}</span></div><div>${lessons.filter(l=>l.group===g.id).map(l=>btn('lesson',`<span class="row-num">${N(l.index)}</span><span><strong>${E(l.title)}</strong><small>${E(l.en)}</small></span><span class="row-state">${state.lessons[l.id]?.complete?'已完成':state.lessons[l.id]?'学习中':l.kind==='case'?'设计练习':'互动课'}</span><span class="row-arrow" aria-hidden="true">↗</span>`,`data-id="${l.id}"`,'lesson-row')).join('')}</div></section>`).join('')}</section>${footer()}</div>`;
}
function diagram(path,id='flow',alt=false){
 const rows=path.length,h=rows*76+20;
 const color=alt?'#e36f3c':'#7dc8b1';
 return `<svg viewBox="0 0 340 ${h}" role="img" aria-label="${E(path.join(' → '))}"><title>${E(path.join(' → '))}</title><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${color}" stroke-width="1.5"/></marker></defs>${path.map((name,i)=>{
 const chars=Array.from(name),lines=[];while(chars.length)lines.push(chars.splice(0,18).join(''));
 return `<g><text x="5" y="${i*76+39}" class="diagram-number">${N(i+1)}</text><rect x="31" y="${i*76+9}" width="294" height="54" stroke="${color}" stroke-width="${i===rows-1?1.6:1}" fill="${i===rows-1?'#304a40':'#2b2d2f'}"/><text x="178" y="${i*76+37-(lines.length-1)*10}" text-anchor="middle" class="diagram-label">${lines.map((line,j)=>`<tspan x="178" dy="${j?20:0}">${E(line)}</tspan>`).join('')}</text>${i<rows-1?`<path d="M178 ${i*76+63}V${i*76+82}" stroke="${color}" fill="none" marker-end="url(#${id}-arrow)"/>`:''}</g>`;
 }).join('')}</svg>`;
}
function sourceNotes(l){return `<details class="sources"><summary>参考资料与教学边界 ↗</summary><p>中文解释、题目与图示为本教材原创。示例数字是简化教学假设，不是性能基准；案例方案不代表相关公司的真实部署。资料链接需要联网打开。</p><a href="${E(l.source)}" target="_blank" rel="noopener noreferrer">Hello Interview · ${E(l.en)}（主题索引） ↗</a>${l.refs.map(([title,url])=>`<a href="${E(url)}" target="_blank" rel="noopener noreferrer">${E(title)} ↗</a>`).join('')}</details>`;}
function lab(l){
 const s=getState(l),i=s.step,step=l.steps[i],decision=l.decisions?.[i];
 const selected=decision?s.decisions[i]??decision.options.findIndex(o=>o.preferred):null;
 const selection=decision?.options[selected],path=selection?.path||step.path;
 return `<div class="lab-toolbar"><p class="step-meta">${l.kind==='case'?'方案对照':'沿着机制走一遍'} / ${N(i+1)} OF ${N(l.steps.length)}</p><div class="step-dots" role="group" aria-label="跳到演示步骤">${l.steps.map((x,j)=>btn('step',N(j+1),`data-step="${j}" aria-label="第${j+1}步：${E(x.title)}" aria-pressed="${i===j}"`,'',`step-${j}`)).join('')}</div></div>
 <div class="lab-body"><div class="diagram-panel">${diagram(path,'lab',selection&&!selection.preferred)}<p class="diagram-caption">${selection?E(selection.text):E(step.title)}</p></div><div class="lab-copy"><p class="eyebrow heat">${l.kind==='case'?E(decision.stage):'观察路径如何变化'}</p><h3>${E(l.kind==='case'?decision.prompt:step.title)}</h3>
 ${decision?`<div class="options" role="group" aria-label="比较方案">${decision.options.map((o,j)=>btn('decision',`<span>${j===selected?'●':'○'}</span><span>${E(o.text)}</span>`,`data-option="${j}" aria-pressed="${selected===j}"`,`option ${selected===j?'selected':''}`,`decision-${j}`)).join('')}</div><div class="feedback neutral" role="status"><strong>${selection.preferred?'本场景的基线方案':'这个选择改变了什么'}</strong><p>${E(selection.feedback)}</p></div>`:`<p class="exploration-copy">${E(step.body)}</p>`}
 <div class="lab-controls">${btn('step','← 上一步',`data-step="${i-1}" ${i===0?'disabled':''}`,'','lab-prev')}${btn('step','下一步 →',`data-step="${i+1}" ${i===l.steps.length-1?'disabled':''}`,'','lab-next')}${btn('reset-path','回到起点','','quiet','reset-path')}</div></div></div>`;
}
function paragraph(text){return `<p>${E(text)}</p>`;}
function renderBlock(l,b){
 if(b.type==='evidence')return `<aside class="evidence-note"><p class="eyebrow">${E(b.title)}</p><a href="${E(b.url)}" target="_blank" rel="noopener noreferrer">${E(b.label)} ↗</a><p>${E(b.text)}</p></aside>`;
 if(b.type==='paragraph')return paragraph(b.text);
 if(b.type==='terms')return `<dl class="term-grid">${b.items.map(([term,meaning])=>`<div><dt>${E(term)}</dt><dd>${E(meaning)}</dd></div>`).join('')}</dl>`;
 if(b.type==='example')return `<aside class="worked-example"><p class="eyebrow">WORKED EXAMPLE / 一起推一遍</p><h3>${E(b.title)}</h3>${b.paragraphs.map(paragraph).join('')}</aside>`;
 if(b.type==='diagram')return `<figure class="reading-figure"><div class="diagram-panel">${diagram(b.path,'reading-'+b.id)}</div><figcaption><h3>${E(b.title)}</h3>${paragraph(b.text)}<p class="margin-note">${E(b.caption)}</p></figcaption></figure>`;
 if(b.type==='comparison')return `<div class="reading-comparison">${b.items.map(x=>`<section><h3>${E(x.title)}</h3>${paragraph(x.text)}</section>`).join('')}</div>`;
 if(b.type==='experiment')return `<p class="explore-instruction">${E(b.instruction)}</p><section id="explore-path" class="lab" aria-label="路径探索">${lab(l)}</section><div id="model-lab">${fieldLabs.render(l.id)}</div>`;
 if(b.type==='conclusion')return `<div id="lesson-recap">${recap(l)}</div>`;
 throw Error('Unknown reading block '+b.type);
}
function quizCard(l,q,i,review=false){
 const s=getState(l),a=s.answers[i]||{},sel=q.options[a.selected],tag=`${review?'review':'quiz'}-${l.id}-${i}`;
 return `<article class="quiz-card" id="${tag}">${review?`<span class="review-context">${E(l.title)} · ${a.wrong?'再试一次':'已纠正 ✓'}</span>`:''}<p class="eyebrow">CHECKPOINT / ${N(i+1)}</p><h3>${E(q.prompt)}</h3><div class="options" role="group" aria-label="${E(q.prompt)}">${q.options.map((o,j)=>btn('answer',`<span class="letter">${String.fromCharCode(65+j)}</span><span>${E(o.text)}</span>`,`data-id="${l.id}" data-question="${i}" data-option="${j}" aria-pressed="${a.selected===j}"`,`option ${a.selected===j?(o.correct?'correct':'wrong'):''}`,`${tag}-option-${j}`)).join('')}</div>
 ${sel?`<div class="feedback ${sel.correct?'good':''}" role="status"><strong>${sel.correct?'这个判断成立。':'我们再想一步。'}</strong><p>${E(sel.feedback)}</p></div>`:''}
 <div class="quiz-actions">${btn('reveal',a.revealed?'收起解析':'直接查看解析',`data-id="${l.id}" data-question="${i}" aria-expanded="${!!a.revealed}"`,'quiet',`${tag}-reveal`)}${btn('retry','重新判断',`data-id="${l.id}" data-question="${i}"`,'quiet',`${tag}-retry`)}</div>
 ${a.revealed?`<div class="answer-key"><strong>在本题条件下：</strong>${q.options.map(o=>`<p>${o.correct?'✓':'↳'} ${E(o.text)} — ${E(o.feedback)}</p>`).join('')}<small>查看解析不会计为答对。</small></div>`:''}</article>`;
}
function quiz(l){return `<div class="quiz-intro"><p class="eyebrow">MAKE IT YOUR OWN</p><h2>换你来判断。</h2><p>不需要记住句子。试着找到条件和结果之间的联系；选错了，就沿着解释再想一遍。</p></div><div class="quiz-list">${l.questions.map((q,i)=>quizCard(l,q,i)).join('')}</div><div class="bottom-nav"><p>错误判断会进入错题回顾，答对后自动移出。</p>${btn('section','回看本课结论 ↑','data-section="takeaway"','text-button')}</div>`;}
function recap(l){
 const s=getState(l),right=l.questions.filter((q,i)=>q.options[s.answers[i]?.selected]?.correct).length,next=byId.get(course.learningOrder[course.learningOrder.indexOf(l.id)+1]);
 return `<p class="eyebrow">TAKE THIS WITH YOU</p><h2 id="heading-takeaway">把这几个想法，带走。</h2><div class="recap"><div class="recap-number">${N(l.index)}<small>FIELDNOTE<br>概念 · 推导 · 实践</small></div><ol class="recap-list">${l.summary.map((x,i)=>`<li><span>${N(i+1)}</span><div>${E(x)}</div></li>`).join('')}</ol></div>
 ${l.decisions?`<section class="saved-design"><h3>你的方案笔记</h3><p class="muted">${Object.keys(s.decisions).length} / 5 个决策已探索，其余展示基线。可以回到实验切换方案。</p><ol>${l.decisions.map((d,i)=>{const o=d.options[s.decisions[i]??d.options.findIndex(x=>x.preferred)];return `<li><strong>${E(d.stage)}</strong>：${o?`${E(o.text)}<br><span class="muted">${E(o.path.join(' → '))}</span>`:'基线方案；可自由探索。'}</li>`;}).join('')}</ol></section>`:''}
 <div class="bottom-nav">${btn('complete',s.complete?'已标记完成 ✓':'标记这一课已完成','',s.complete?'text-button':'primary',`complete-lesson`)}${next?btn('lesson','推荐下一课：'+E(next.en)+' →',`data-id="${next.id}"`,'text-button'):btn('home','回到课程总览 →','','text-button')}</div><p class="muted" style="font:12px/1.8 var(--sans);margin-top:18px">完成标记只记录学习进度，不代表通过考试。全部课程都可以自由访问。</p>${sourceNotes(l)}`;
}
function lessonPage(l){const s=getState(l);return `<div class="page reader-page"><div class="breadcrumb"><a href="#home">← 课程总览</a><span>${E(course.groups.find(g=>g.id===l.group).title)} / ${N(l.index)}</span></div><header class="lesson-header"><p class="eyebrow">${E(l.en)} / FIELDNOTE ${N(l.index)}</p><h1>${E(l.title)}</h1><p class="reader-dek">${E(l.reading.dek)}</p><div class="lesson-sub"><span>10–15 分钟 · 含图解与动手推演</span>${l.prereqs.length?`<span>先修建议：</span>${l.prereqs.map(id=>btn('lesson',E(byId.get(id).en),`data-id="${id}"`)).join('')}`:'<span>从零开始也能读</span>'}</div></header>
 <nav class="reading-nav" aria-label="本课定位">${l.reading.sections.map(x=>btn('section',E(x.label),`data-section="${x.id}"`,'',`nav-${x.id}`)).join('')}${btn('section','自测','data-section="check"','','nav-check')}</nav>
 <article class="lesson-reading">${l.reading.sections.map((section,i)=>`<section id="section-${section.id}" class="reading-section" tabindex="-1" aria-labelledby="heading-${section.id}"><p class="eyebrow heat">${N(i+1)} / ${E(section.label)}</p>${section.id==='takeaway'?'':`<h2 id="heading-${section.id}">${E(section.title)}</h2>`}${section.blocks.map(b=>renderBlock(l,b)).join('')}</section>`).join('')}</article>
 <details id="section-check" class="optional-quiz" ${s.section==='check'?'open':''}><summary>检验理解 · 3 道可选自测 <span>已读完也可以直接进入下一课</span></summary>${quiz(l)}</details>${footer()}</div>`;}
function review(){
 const items=reviewSnapshot.filter(x=>byId.has(x.id)).map(x=>({l:byId.get(x.id),i:x.i}));
 return `<div class="page"><div class="breadcrumb"><a href="#home">← 课程总览</a><span>REVISIT & UNDERSTAND</span></div><p class="eyebrow">YOUR SECOND LOOK</p><h1>再想一步，就更清楚。</h1><p>这里收下你曾经犹豫的判断。答对后，会从待复习列表移出。</p>${items.length?`<div class="quiz-list">${items.map(({l,i})=>`<section class="review-group">${quizCard(l,l.questions[i],i,true)}${btn('lesson','回到这一课的讲解 →',`data-id="${l.id}"`,'text-button')}</section>`).join('')}</div>`:`<section class="empty-state"><span class="big-check" aria-hidden="true">✓</span><h2>暂时没有待复习的题。</h2><p>去一个感兴趣的主题做做判断。错误不会扣分，只会告诉你哪里值得再看一眼。</p>${btn('home','探索课程 →','','primary')}</section>`}${footer()}</div>`;
}
function render(){renderSidebar();document.getElementById('main').innerHTML=route.view==='lesson'?lessonPage(byId.get(route.id)):route.view==='review'?review():home();document.title=route.view==='lesson'?byId.get(route.id).title+' · 系统设计互动札记':'系统设计互动札记 · Learn & Think';save();}
function closeMenu(){document.getElementById('sidebar').classList.remove('menu-open');document.getElementById('menu-toggle').setAttribute('aria-expanded','false');}
function visitSection(section,focus=true){
 const el=document.getElementById('section-'+section);if(!el)return;
 if(el.matches('details'))el.open=true;
 el.scrollIntoView({block:'start',behavior:'instant'});document.querySelectorAll('.reading-nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.section===section?'location':'false'));if(focus)(el.matches('details')?el.querySelector('summary'):el).focus({preventScroll:true});
}
let scrollFrame;
function observeReading(){
 if(scrollFrame)cancelAnimationFrame(scrollFrame);
 scrollFrame=requestAnimationFrame(()=>{
  scrollFrame=null;if(route.view!=='lesson')return;
  const edge=Math.max(160,(document.querySelector('.reading-nav')?.getBoundingClientRect().bottom||0)+32);
  let section='scene';for(const el of document.querySelectorAll('.reading-section,.optional-quiz')){if(el.getBoundingClientRect().top<=edge)section=el.id.slice(8);}
  document.querySelectorAll('.reading-nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.section===section?'location':'false'));
  const s=getState(byId.get(route.id));if(s.section!==section){s.section=section;save();}
 });
}
function enterRoute(){route=readRoute();if(route.view==='lesson'){state.last=route.id;getState(byId.get(route.id));}if(route.view==='review')reviewSnapshot=misses().map(x=>({id:x.l.id,i:x.i}));closeMenu();render();window.scrollTo({top:0,behavior:'instant'});document.getElementById('main').focus({preventScroll:true});if(route.view==='lesson'){const section=getState(byId.get(route.id)).section;if(section!=='scene')visitSection(section,false);}observeReading();}
document.getElementById('sidebar').addEventListener('toggle',e=>{if(e.target.matches('details[data-group]')){e.target.open?openGroups.add(e.target.dataset.group):openGroups.delete(e.target.dataset.group);}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();document.getElementById('menu-toggle').focus();}});
function replaceLocal(el,html,focusId){if(!el)return;el.innerHTML=html;if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});}
function updateExperiment(l,op,value,focusId){
 const message=fieldLabs.handle(l.id,op,value),container=document.getElementById('model-lab');
 // Range controls remain mounted throughout pointer/keyboard input.
 if(value!==undefined){const temp=document.createElement('div');temp.innerHTML=fieldLabs.render(l.id);container.querySelector('.hands-visual').innerHTML=temp.querySelector('.hands-visual').innerHTML;container.querySelector('.sim-log').textContent=message;container.querySelectorAll('output[data-value]').forEach(o=>o.textContent=temp.querySelector(`output[data-value="${o.dataset.value}"]`).textContent);}
 else replaceLocal(container,fieldLabs.render(l.id),focusId);
 announce(message);
}
document.addEventListener('input',e=>{const t=e.target;if(!t.matches('input[data-experiment]'))return;const l=byId.get(route.id);if(l)updateExperiment(l,t.dataset.experiment,Number(t.value));});
document.addEventListener('click',e=>{
 if(e.target.closest('a.skip-link')){e.preventDefault();document.getElementById('main').focus();return;}
 const target=e.target.closest('button[data-action]');if(!target||target.disabled)return;
 const d=target.dataset,action=d.action,oldFocus=target.id;
 if(action==='home'){go('home');return;}if(action==='lesson'){if(byId.has(d.id))go('lesson',d.id);return;}
 if(action==='review'){go('review');return;}
 if(action==='menu'){const el=document.getElementById('sidebar');el.classList.toggle('menu-open');target.setAttribute('aria-expanded',String(el.classList.contains('menu-open')));return;}
 if(action==='filter'){filter=d.group;render();document.getElementById(oldFocus)?.focus({preventScroll:true});return;}
 const l=byId.get(d.id||route.id),s=l?getState(l):null;if(!l)return;
 if(action==='section'){s.section=d.section;visitSection(d.section);save();return;}
 if(action==='experiment'){updateExperiment(l,d.op,undefined,oldFocus);return;}
 if(['step','decision','reset-path'].includes(action)){
  if(action==='step')s.step=Math.max(0,Math.min(l.steps.length-1,Number(d.step)));
  if(action==='decision')s.decisions[s.step]=Number(d.option);
  if(action==='reset-path'){s.step=0;s.decisions={};}
  replaceLocal(document.getElementById('explore-path'),lab(l),oldFocus);
  replaceLocal(document.getElementById('lesson-recap'),recap(l));
  announce(action==='decision'?l.decisions[s.step].options[Number(d.option)].feedback:action==='reset-path'?'路径已回到基线。':l.steps[s.step].body);save();return;
 }
 if(['answer','reveal','retry'].includes(action)){
  const i=Number(d.question),a=s.answers[i]||(s.answers[i]={selected:null,revealed:false,wrong:false,attempts:0});
  if(action==='answer'){a.selected=Number(d.option);a.wrong=!l.questions[i].options[a.selected].correct;a.attempts++;announce(l.questions[i].options[a.selected].feedback);}
  if(action==='reveal')a.revealed=!a.revealed;
  if(action==='retry'){a.selected=null;a.revealed=false;announce('已重置本题选择；再次答对后会移出错题回顾。');}
  const review=route.view==='review',card=document.getElementById(`${review?'review':'quiz'}-${l.id}-${i}`);card.outerHTML=quizCard(l,l.questions[i],i,review);document.getElementById(oldFocus)?.focus({preventScroll:true});renderSidebar();save();return;
 }
 if(action==='complete'){s.complete=!s.complete;replaceLocal(document.getElementById('lesson-recap'),recap(l),oldFocus);renderSidebar();announce(s.complete?'本课已标记完成。':'已取消完成标记。');save();}
});
window.addEventListener('scroll',observeReading,{passive:true});
window.addEventListener('resize',observeReading);
window.addEventListener('hashchange',enterRoute);
enterRoute();
})();
