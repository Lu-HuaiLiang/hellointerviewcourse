import fs from 'node:fs';
const root=new URL('../',import.meta.url);
function blockMarkdown(b,l){
 if(b.type==='paragraph')return b.text+'\n';
 if(b.type==='terms')return b.items.map(([term,meaning])=>`- **${term}**：${meaning}`).join('\n')+'\n';
 if(b.type==='diagram')return `### ${b.title}\n\n${b.text}\n\n路径：${b.path.join(' → ')}\n\n${b.caption}\n`;
 if(b.type==='example')return `### ${b.title}\n\n${b.paragraphs.join('\n\n')}\n`;
 if(b.type==='comparison')return b.items.map(x=>`**${x.title}**\n\n${x.text}\n`).join('\n');
 if(b.type==='evidence')return `[${b.label}](${b.url})\n\n${b.text}\n`;
 if(b.type==='conclusion')return l.summary.map(x=>'- '+x).join('\n')+'\n';
 if(b.type==='experiment')return `${b.instruction}\n\n[打开本课互动网页](../index.html#lesson/${l.id})。下面保留全部方案与代价，离开网页也能阅读。\n\n`+l.decisions.map(d=>`### ${d.stage}：${d.prompt}\n\n`+d.options.map(o=>`**${o.preferred?'基线':'备选'}：${o.text}**\n\n${o.feedback}\n\n路径：${o.path.join(' → ')}\n`).join('\n')).join('\n');
 throw Error('Unknown note block '+b.type);
}
export function exportNotes(course){
 fs.mkdirSync(new URL('problem-breakdowns/',root),{recursive:true});
 for(const l of course.lessons.filter(x=>x.kind==='case')){
  const parts=[`# ${l.title}`,'[返回全题目录](README.md)',`[阅读与互动](../index.html#lesson/${l.id}) · [Hello Interview 主题来源](${l.source})`,'原创中文教材，与网页使用同一份课程数据。',l.reading.dek];
  for(const s of l.reading.sections)parts.push(`## ${s.label} · ${s.title}`,...s.blocks.map(b=>blockMarkdown(b,l)));
  parts.push('## 可选自测');
  for(const [i,q] of l.questions.entries())parts.push(`### ${i+1}. ${q.prompt}`,q.options.map(o=>'- '+o.text).join('\n'),'<details><summary>展开解析</summary>','',...q.options.map(o=>`${o.correct?'✓':'↳'} **${o.text}**：${o.feedback}`),'','</details>');
  parts.push('## 延伸阅读',...l.refs.map(([title,url])=>`- [${title}](${url})`));
  fs.writeFileSync(new URL(`problem-breakdowns/${l.id}.md`,root),parts.join('\n\n')+'\n');
 }
}
