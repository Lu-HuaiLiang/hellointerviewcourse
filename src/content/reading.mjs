// Editorial records contain one deliberately authored lesson per @id. No quiz-derived prose.
export function parseReadingNotes(text){
 const notes=new Map();
 for(const record of text.trim().split(/^@/m).filter(Boolean)){
  const [id,...lines]=record.trim().split(/\r?\n/);
  if(notes.has(id))throw Error('Duplicate editorial lesson: '+id);
  if(lines.length!==8||lines.some(x=>!x.trim()))throw Error('Incomplete editorial lesson: '+id);
  const [dek,termA,termB,principle,mechanism,example,boundary,instruction]=lines;
  const terms=[termA,termB].map(t=>{const parts=t.split('|');if(parts.length!==2||parts.some(x=>!x.trim()))throw Error('Invalid term in '+id);return parts;});
  notes.set(id,{dek,terms,principle,mechanism,example,boundary,instruction});
 }
 return notes;
}
const para=text=>({type:'paragraph',text});
const section=(id,label,title,blocks)=>({id,label,title,blocks});
export function attachReading(l,n){
 if(!n)throw Error('Missing editorial content: '+l.id);
 const wild=l.group==='wild';
 const steps=l.steps.map((s,i)=>({type:'diagram',id:'step-'+i,title:l.decisions?l.decisions[i].stage+' · '+s.title:s.title,path:s.path,text:s.body,caption:l.decisions?'基线设计 · '+l.decisions[i].options.find(o=>o.preferred).text:wild?(i<2?'公开做法的简化图解；机制解释见上文。':'由公开做法延伸的机制推演。'):'沿箭头核对输入、状态变化与结果。'}));
 const evidence=wild?[{type:'evidence',title:'公开工程来源',url:l.refs[0][1],label:l.refs[0][0],text:'本课引用文章所述方案，不表示该公司当前完整部署。下方算例与可操作模型为教学推演。',verified:'2026-09-13'}]:[];
 return {...l,reading:{version:2,dek:n.dek,sections:[
  section('scene','遇见问题','先从一个具体场景开始',[para(l.scene)]),
  section('principle','概念原理',wild?'从公开做法，理解机制':'先把概念讲清楚',[...evidence,{type:'terms',items:n.terms},para(n.principle),para(n.mechanism)]),
  section('walkthrough','图解推导',l.kind==='case'?'从约束，一步步搭出基线':'把抽象机制放进数据流',[
   ...(l.entity?[{type:'comparison',items:[{title:'需要保存的实体',text:l.entity},{title:'对外接口示例',text:l.api}]}]:[]),...steps]),
  section('example','具体例子',wild?'换一个小场景，检验原理':'用一个例子，把因果连起来',[{type:'example',title:wild?'教学推演 · 与生产参数无关':'从条件推到结果',paragraphs:[n.example]}]),
  section('explore','动手探索','现在，亲手改变一个条件',[{type:'experiment',instruction:n.instruction}]),
  section('boundary','适用边界','什么时候，需要重新考虑',[para(n.boundary),...(l.kind==='case'?[{type:'comparison',items:l.decisions[3].options.map(o=>({title:o.preferred?'本场景下的扩展方向':'另一条路径与它的代价',text:o.text+'。'+o.feedback}))}]:[])]),
  section('takeaway','带走结论','把这几个想法，带走',[{type:'conclusion'}])
 ]}};
}
export function validateReading(lessons,notes){
 if(notes.size!==lessons.length)throw Error('Editorial inventory differs from catalog');
 const ids=new Set(lessons.map(l=>l.id));for(const id of notes.keys())if(!ids.has(id))throw Error('Unknown editorial lesson '+id);
 for(const l of lessons){
  const r=l.reading;if(!r||r.sections.length!==7)throw Error('Incomplete reading '+l.id);
  const blocks=r.sections.flatMap(s=>s.blocks);
  for(const type of ['paragraph','terms','diagram','example','experiment','conclusion'])if(!blocks.some(b=>b.type===type))throw Error('Missing '+type+' in '+l.id);
  if(new Set(l.steps.map(s=>s.path.join('>'))).size<2)throw Error('Exploration must change visual state '+l.id);
 }
}
