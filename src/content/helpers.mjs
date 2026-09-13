export const groups = [
  {id:'start',title:'从这里开始',en:'THE FOUNDATIONS',note:'先学会问问题，再学会画系统。'},
  {id:'concept',title:'建立系统直觉',en:'CORE CONCEPTS',note:'从一次请求出发，看清数据怎样流动。'},
  {id:'tech',title:'认识你的工具',en:'KEY TECHNOLOGIES',note:'先理解工作方式，再决定是否需要它。'},
  {id:'pattern',title:'识别常见模式',en:'DESIGN PATTERNS',note:'看似不同的问题，常有相似的结构。'},
  {id:'case',title:'把系统搭起来',en:'DESIGN PRACTICE',note:'在具体约束里，练习做出有理由的选择。'},
  {id:'advanced',title:'再往深处走',en:'DEEPER EXPLORATIONS',note:'追问一句“如果呢”，就能多理解一层。'},
  {id:'wild',title:'走进真实系统',en:'IN THE WILD',note:'读工程实践，再用小实验验证其中的道理。'}
];
export const sources = {
  http:['HTTP 语义 · RFC 9110','https://www.rfc-editor.org/rfc/rfc9110.html'],
  tcp:['TCP · RFC 9293','https://www.rfc-editor.org/rfc/rfc9293.html'],
  pg:['PostgreSQL · 索引','https://www.postgresql.org/docs/current/indexes.html'],
  tx:['PostgreSQL · 事务隔离','https://www.postgresql.org/docs/current/transaction-iso.html'],
  redis:['Redis · 缓存淘汰','https://redis.io/docs/latest/develop/reference/eviction/'],
  kafka:['Apache Kafka · 设计','https://kafka.apache.org/41/design/design/'],
  dynamo:['Amazon DynamoDB · 核心概念','https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html'],
  cassandra:['Apache Cassandra · 数据建模','https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html'],
  elastic:['Elasticsearch · 近实时搜索','https://www.elastic.co/docs/manage-data/data-store/near-real-time-search'],
  flink:['Apache Flink · 事件时间','https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/'],
  zk:['Apache ZooKeeper · 概述','https://zookeeper.apache.org/doc/current/zookeeperOver.html'],
  s3:['Amazon S3 · 分段上传','https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html'],
  sse:['HTML 标准 · Server-sent events','https://html.spec.whatwg.org/multipage/server-sent-events.html'],
  cap:['Gilbert & Lynch · CAP 论文','https://users.ece.cmu.edu/~adrian/731-sp04/readings/GL-cap.pdf'],
  hash:['Amazon Dynamo · 一致性哈希与复制','https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf'],
  geo:['PostGIS · 空间索引','https://postgis.net/workshops/postgis-intro/indexing.html'],
  vector:['pgvector · 向量与近似检索','https://github.com/pgvector/pgvector'],
  cdc:['Debezium · 架构','https://debezium.io/documentation/reference/stable/architecture.html'],
  prometheus:['Prometheus · 数据模型','https://prometheus.io/docs/concepts/data_model/'],
  crdt:['Yjs · 共享类型','https://docs.yjs.dev/getting-started/working-with-shared-types'],
  stripe:['Stripe · 幂等请求','https://docs.stripe.com/api/idempotent_requests'],
  shopify:['Shopify Engineering · 库存预留','https://shopify.engineering/scaling-inventory-reservations'],
  discord:['Discord Engineering · 消息存储','https://discord.com/blog/how-discord-stores-trillions-of-messages'],
  slack:['Slack Engineering · Job Queue','https://slack.engineering/scaling-slacks-job-queue/'],
  figma:['Figma Engineering · Multiplayer','https://www.figma.com/blog/how-figmas-multiplayer-technology-works/'],
  spotify:['Spotify Engineering · 数据湖点查','https://engineering.atspotify.com/2026/7/indexing-the-data-lake-for-online-point-queries'],
  bloom:['Redis · 布隆过滤器的原理与边界','https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/'],
  hll:['Flajolet 等 · HyperLogLog 论文','https://algo.inria.fr/flajolet/Publications/FlFuGaMe07.pdf'],
  cms:['Redis · Count-Min Sketch','https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/']
};
// A choice owns its explanation and visual state; choosing an alternative is reversible.
export function question(prompt, good, bad, why, misconception, n=0) {
  const options=[{text:good,correct:true,feedback:why},{text:bad,correct:false,feedback:misconception}];
  if(n%2===0)options.reverse();
  return {prompt,options};
}
export function concept(id,title,group,scene,beats,quiz,summary,refs=[],prereqs=[]) {
  return {id,title,group,scene,goal:summary[0],prereqs,refs,summary,kind:'concept',
    steps:beats.map(([title,body,path])=>({title,body,path:path.split('>')})),
    questions:quiz.map((q,i)=>question(...q,i)),
    experiment:{title:'换一个条件，看看会怎样',presets:beats.map(([title,body,path],i)=>({label:title,body,path:path.split('>'),tag:['起点','改变条件','观察代价'][i%3]}))}};
}
export function caseStudy(id,title,scene,entity,api,decisions,recap,refs=[],prereqs=[]) {
  // Decision tuple: prompt, preferred, alternative, preferred feedback, alternative feedback,
  // preferred graph path, alternative graph path. No canned random scores.
  const ds=decisions.map((d,i)=>({prompt:d[0],stage:['需求边界','实体与接口','基础架构','扩展瓶颈','故障处理'][i],options:[
    {text:d[1],feedback:d[3],path:d[5].split('>'),preferred:true},
    {text:d[2],feedback:d[4],path:d[6].split('>'),preferred:false}
  ].sort((a,b)=>i%2?Number(b.preferred)-Number(a.preferred):Number(a.preferred)-Number(b.preferred))}));
  return {id,title,group:'case',kind:'case',scene,goal:recap[0],entity,api,refs,prereqs,decisions:ds,summary:recap,
    steps:[
      {title:'先划定边界',body:decisions[0][3],path:decisions[0][5].split('>')},
      {title:'把数据和接口连起来',body:`核心实体：${entity}。接口示例：${api}。${decisions[1][3]}`,path:decisions[1][5].split('>')},
      {title:'跑通一条主路径',body:decisions[2][3],path:decisions[2][5].split('>')},
      {title:'沿着瓶颈扩展',body:decisions[3][3],path:decisions[3][5].split('>')},
      {title:'处理不确定的结果',body:decisions[4][3],path:decisions[4][5].split('>')}
    ],
    questions:[2,3,4].map((j,i)=>question('复盘：'+decisions[j][0],decisions[j][1],decisions[j][2],decisions[j][3],decisions[j][4],i))};
}
