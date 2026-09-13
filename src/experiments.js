// Small deterministic teaching models. Each model states its assumptions in the UI.
const fieldLabs=(()=>{
 const models=new Map();
 const aliases={'scaling-writes':'queue','slack-job-queue':'queue','dealing-with-contention':'stock','ticketmaster':'stock','flash-sale':'stock','caching':'cache','sharding':'shard','consistent-hashing':'hash','cap-theorem':'cap'};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const base=kind=>({kind,mode:kind==='stock'?'unsafe':kind==='cache'?'off':kind==='cap'?'consistent':'normal',tick:0,requests:0,db:0,hits:0,backlog:0,processed:0,nodes:kind==='queue'?1:3,stock:1,accepted:0,phase:0,a:100,b:100,partition:false,log:'选择一个条件，观察变化；有运行按钮时可以继续推进。'});
 const get=id=>{if(!aliases[id])return null;if(!models.has(id))models.set(id,base(aliases[id]));return models.get(id);};
 const button=(op,label,selected)=>`<button data-action="experiment" data-op="${op}" id="experiment-${op}" ${selected!==undefined?`aria-pressed="${selected}"`:''}>${esc(label)}</button>`;
 const bar=(label,value,max,heat=false)=>`<div class="meter-row"><span>${esc(label)}</span><strong>${value}</strong><div class="meter-track"><i style="width:${Math.min(100,value/max*100)}%;background:${heat?'var(--heat)':'var(--mint)'}"></i></div></div>`;
 function hashOwners(nodes){const positions=nodes===3?[0,120,240]:[0,60,120,240];return Array.from({length:12},(_,i)=>{const angle=15+i*30;return positions.find(p=>p>=angle)??0;});}
 function ring(s){const positions=s.nodes===3?[0,120,240]:[0,60,120,240];const names={0:'A',60:'D',120:'B',240:'C'},old=hashOwners(3),now=hashOwners(s.nodes);const xy=(deg,r)=>[170+Math.cos((deg-90)*Math.PI/180)*r,150+Math.sin((deg-90)*Math.PI/180)*r];return `<svg viewBox="0 0 340 306" role="img" aria-label="${s.nodes}个节点，${now.filter((v,i)=>v!==old[i]).length}个键迁移"><circle cx="170" cy="150" r="108" fill="none" stroke="#62766c"/>${now.map((n,i)=>{const [x,y]=xy(15+i*30,108),[tx,ty]=xy(15+i*30,83);return `<circle cx="${x}" cy="${y}" r="5" fill="${n!==old[i]?'#e36f3c':'#a8ead5'}"/><text x="${tx}" y="${ty+4}" text-anchor="middle" fill="#c6d3cc" font-size="11" font-family="monospace">k${i+1}</text>`;}).join('')}${positions.map(p=>{const [x,y]=xy(p,108);return `<rect x="${x-13}" y="${y-13}" width="26" height="26" fill="${p===60?'#e36f3c':'#7dc8b1'}"/><text x="${x}" y="${y+5}" text-anchor="middle" fill="#202124" font-size="14" font-family="monospace">${names[p]}</text>`;}).join('')}<text x="170" y="146" text-anchor="middle" fill="#f5f3ee" font-size="26" font-family="monospace">${now.filter((v,i)=>v!==old[i]).length} / 12</text><text x="170" y="171" text-anchor="middle" fill="#b7c2bc" font-size="12">相对三节点迁移的键</text></svg>`;}
 function render(id){const s=get(id);if(!s)return '';let title='',controls='',visual='',note='';
 if(s.kind==='cache'){
  title='亲手发出一批读取';note='每批10次请求：关闭缓存或缓存失效时全部回源；90%命中时固定9次命中。只计算请求数量，不模拟真实延迟。';
  controls=button('cache-off','不使用缓存',s.mode==='off')+button('cache-on','90% 命中',s.mode==='on')+button('cache-fail','缓存失效',s.mode==='fail')+button('run','发出 10 次读取');
  visual=bar('请求总数',s.requests,Math.max(s.requests,10))+bar('缓存命中',s.hits,Math.max(s.requests,10))+bar('数据库回源',s.db,Math.max(s.requests,10),true);
 }else if(s.kind==='queue'){
  title='让时间走一秒';note='教学假设：每秒到达1000个任务；一个Worker处理600个，两个处理1200个。先到达再处理，不计算启动与I/O成本。';
  controls=button('workers-1','1 个 Worker',s.nodes===1)+button('workers-2','2 个 Worker',s.nodes===2)+button('pause','暂停新任务',s.mode==='paused')+button('normal','恢复新任务',s.mode==='normal')+button('run','推进 1 秒');
  const workers=s.nodes===2?2:1;visual=`<p class="lab-big">${s.backlog}<small>个任务仍在等待</small></p>`+bar('已到达',s.requests,Math.max(s.requests,1))+bar('已处理',s.processed,Math.max(s.requests,1))+`<p class="sim-meta">${s.tick} 秒 · ${workers} 个 Worker · ${workers*600} 个/秒容量</p>`;
 }else if(s.kind==='stock'){
  title='让两位买家争同一份库存';note='库存初始为1。非原子模式：A、B先各读到1，再分别写0；条件更新模式：检查和扣减在同一步完成。';
  controls=button('unsafe','先读后写',s.mode==='unsafe')+button('atomic','原子条件更新',s.mode==='atomic')+button('run',s.phase>=2?'再跑一轮':'推进下一步');
  visual=`<div class="replicas"><div><span>库存记录</span><strong>${s.stock}</strong></div><div><span>承诺给买家</span><strong class="${s.accepted>1?'heat':''}">${s.accepted}</strong></div></div><p class="sim-meta">${s.accepted>1?'库存看似正常，却承诺卖出了两份。':s.phase===0?'A 与 B 都准备购买。':s.phase===1?'两个请求正在竞争。':'只有一个买家获得库存。'}</p>`;
 }else if(s.kind==='shard'){
  title='看看流量会落到哪一片';note='12个键，每键通常10次读取，按键编号取模分片。热点模式把k1增加到90次。分片只改变归属，不复制或拆分一个键。';
  controls=button('shards-3','3 个分片',s.nodes===3)+button('shards-4','4 个分片',s.nodes===4)+button('normal','均匀流量',s.mode==='normal')+button('hot','k1 成为热点',s.mode==='hot');
  const loads=Array(s.nodes).fill(0);for(let k=1;k<=12;k++)loads[k%s.nodes]+=s.mode==='hot'&&k===1?90:10;
  visual=loads.map((v,i)=>bar('分片 '+String.fromCharCode(65+i),v,Math.max(...loads),v===Math.max(...loads)&&s.mode==='hot')).join('');
 }else if(s.kind==='hash'){
  title='在哈希环上加入一个节点';note='12个固定键，顺时针寻找节点。初始节点位于0°、120°、240°；新增D位于60°。橙色键表示归属改变，本例不使用虚拟节点。';
  controls=button('shards-3','原来的 A / B / C',s.nodes===3)+button('shards-4','加入 D 节点',s.nodes===4);visual=ring(s);
 }else if(s.kind==='cap'){
  title='断开两个副本之间的网络';note='余额初始100。教学简化：正常时两副本同步；分区时一致模式拒绝这次无法协调的写入，可用模式只更新A，恢复时将本例唯一写入同步到B。';
  controls=button('cut','断开网络',s.partition)+button('consistent','优先一致',s.mode==='consistent')+button('available','优先响应',s.mode==='available')+button('run','向 A 写入余额 80')+button('heal','恢复网络');
  visual=`<div class="replicas"><div><span>副本 A</span><strong>${s.a}</strong></div><div><span>副本 B</span><strong>${s.b}</strong></div></div><p class="sim-meta">${s.partition?'A　×　B　网络分区':'A　↔　B　网络连通'}</p>`;
 }
 return `<section class="hands-on" aria-label="${esc(title)}"><div class="hands-header"><p class="eyebrow">A SMALL EXPERIMENT</p><h3>${esc(title)}</h3></div><div class="hands-body"><div class="hands-visual">${visual}</div><div class="hands-controls"><div class="experiment-buttons" role="group" aria-label="实验控制">${controls}${button('reset','重置实验')}</div><p class="sim-log" role="status">${esc(s.log)}</p></div></div><p class="hands-note">${esc(note)}</p></section>`;
 }
 function handle(id,op){let s=get(id);if(!s)return '';
  if(op==='reset'){models.set(id,base(s.kind));return '实验已重置，课程与答题进度保持不变。';}
  if(op.startsWith('cache-')){s.mode=op.slice(6);s.log='已切换条件。下一批读取将按新条件计算，累计数据保留。';}
  if(op==='workers-1'||op==='workers-2'){s.nodes=Number(op.slice(-1));s.log=`下一个时间步使用${s.nodes}个Worker。`;}
  if(op==='pause'||op==='normal'||op==='hot'){s.mode=op==='pause'?'paused':op;s.log=op==='hot'?'同一热键仍由一个分片负责。':op==='pause'?'入口暂停，继续推进时间可以消化积压。':'已恢复普通条件。';}
  if(op.startsWith('shards-')){s.nodes=Number(op.slice(-1));s.log=s.kind==='hash'?(s.nodes===4?'节点D只接管0°到60°内的键。':'已回到三节点，所有键恢复原归属。'):'键按新分片数重新取模；数据归属与负载随之变化。';}
  if(op==='unsafe'||op==='atomic'){s.mode=op;s.stock=1;s.accepted=0;s.phase=0;s.log='已切换策略并重置这一轮库存。';}
  if(op==='cut'){s.partition=true;s.log='网络已分区。现在向A写入，观察另一侧。';}
  if(op==='consistent'||op==='available'){s.mode=op;s.log='策略已切换；已有分歧不会自动消失，需恢复同步。';}
  if(op==='heal'){s.partition=false;s.b=s.a;s.log='本例没有并发冲突，B复制A的唯一变更；多方写入时还需要合并规则。';}
  if(op==='run'){
   if(s.kind==='cache'){s.requests+=10;const hits=s.mode==='on'?9:0;s.hits+=hits;s.db+=10-hits;s.log=`本批：缓存命中${hits}次，回源${10-hits}次。累计${s.requests}次读取。`;}
   if(s.kind==='queue'){const incoming=s.mode==='paused'?0:1000,capacity=s.nodes===2?1200:600,done=Math.min(s.backlog+incoming,capacity);s.tick++;s.requests+=incoming;s.processed+=done;s.backlog+=incoming-done;s.log=`第${s.tick}秒：到达${incoming}，处理${done}，积压${s.backlog}。`;}
   if(s.kind==='stock'){if(s.phase>=2){s.phase=0;s.stock=1;s.accepted=0;}s.phase++;if(s.mode==='unsafe'){if(s.phase===1)s.log='A与B都读取到库存1，都决定可以购买。';else{s.stock=0;s.accepted=2;s.log='A写0并成功，B也写0并成功。库存不是负数，仍然发生超卖。';}}else{if(s.phase===1){s.stock=0;s.accepted=1;s.log='A的条件更新成功，库存从1变为0。';}else s.log='B的条件更新检查到库存0，拒绝购买。总计只承诺一份。';}}
   if(s.kind==='cap'){if(s.partition&&s.mode==='consistent')s.log='拒绝这次无法协调的写入：不新增分歧，但这次请求不可用。';else{s.a=80;if(!s.partition)s.b=80;s.log=s.partition?'A返回成功，B仍为100：此时读取两侧会得到不同值。':'两副本都更新为80。';}}
  }
  return s.log;
 }
 return {render,handle};
})();
