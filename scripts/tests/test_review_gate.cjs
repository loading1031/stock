const assert = require('node:assert/strict');
const {evaluateReview,refreshPull} = require('../review-gate.cjs');
const bot={login:'chatgpt-codex-connector[bot]',type:'Bot'},head='sha1';
function summary(status='completed',sha=head,extra={},rows='') {
 return {id:1,user:bot,created_at:'2026-10-18T00:00:00Z',updated_at:'2026-10-18T00:06:00Z',
 body:'<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 '+JSON.stringify({code_review:{commit_sha:sha,status},...extra})+' -->\n| 📝 **Code Review** | ✅ **Completed** <relative-time datetime="2026-10-18T00:04:00.000Z">time</relative-time> |\n'+rows};
}
const request=(body,time='2026-10-18T00:05:00Z')=>({id:2,user:{login:'owner',type:'User'},author_association:'OWNER',body,created_at:time,updated_at:time});
(async()=>{
 const cases=[
 ['missing',[],'pending'], ['running',[summary('running')],'pending'], ['complete',[summary()],'success'],
 ['stale',[summary('completed','old')],'pending'], ['failed',[summary('failed')],'failure'],
 ['forged',[{...summary(),user:{login:'fake',type:'User'}}],'pending'],
 ['malformed',[{...summary(),body:'<!-- codex-pull-request-review-summary --><!-- codex-review-state:v1 {bad} -->'}],'failure'],
 ['whole summary updated but code completion old',[summary(),request('@codex review')],'pending'],
 ['newer code completion',[summary(),request('@codex review','2026-10-18T00:03:00Z')],'success'],
 ['security absent, unrelated code completion newer',[summary(),request('@codex security review','2026-10-18T00:03:00Z')],'pending'],
 ['security old completion row',[summary('completed',head,{security_review:{commit_sha:head,status:'completed'}},'| **Security Review** | **Completed** <relative-time datetime="2026-10-18T00:01:00Z">time</relative-time> |'),request('@codex security review','2026-10-18T00:03:00Z')],'pending'],
 ['security completion matches channel',[summary('completed',head,{security_review:{commit_sha:head,status:'completed'}},'| **Security Review** | **Completed** <relative-time datetime="2026-10-18T00:04:00Z">time</relative-time> |'),request('@codex security review','2026-10-18T00:03:00Z')],'success'],
 ['security running',[summary('completed',head,{security_review:{commit_sha:head,status:'running'}})],'pending'],
 ['untrusted request',[summary(),{...request('@codex review'),author_association:'NONE'}],'success'],
 ];
 for(const [label,comments,state] of cases)assert.equal(evaluateReview(head,comments).state,state,label);
 assert.equal(evaluateReview(head,[summary()],[{user:bot,content:'eyes'}]).state,'pending');
 assert.equal(evaluateReview(head,[summary()],[{user:{login:'stranger',type:'User'},content:'eyes'}]).state,'success');
 const pull=n=>({number:n,state:'open',head:{sha:head},base:{ref:n===1?'dev':'main'}});
 let posts=[],listCalls=0;
 const client={rest:{pulls:{get:async()=>({data:pull(1)})},repos:{createCommitStatus:async s=>posts.push(s)}},paginate:async(route,params)=>{
 if(route.endsWith('/pulls')){listCalls++;return [pull(1),pull(2)];}
 if(route.endsWith('/reactions'))return [];
 return params.issue_number===1?[summary()]:[];
 }};
 assert.equal((await refreshPull(client,{owner:'a',repo:'b'},1)).state,'pending');
 assert.ok(posts.every(p=>p.state==='pending'),'unreviewed sibling must prevent success');
 posts=[];listCalls=0;
 client.paginate=async(route)=>{
 if(route.endsWith('/pulls'))return ++listCalls===1?[pull(1)]:[{...pull(1),head:{sha:'new'}}];
 return route.endsWith('/reactions')?[]:[summary()];
 };
 assert.equal(await refreshPull(client,{owner:'a',repo:'b'},1),null);
 assert.deepEqual(posts.map(p=>p.state),['pending']);
 const malformed = summary();
 malformed.body = malformed.body.replace('2026-10-18T00:04:00.000Z', 'invalid');
 assert.equal(evaluateReview(head,[malformed,request('@codex review','2026-10-18T00:03:00Z')]).state,'pending');
 assert.equal(evaluateReview(head,[summary(),request('@codex review','invalid')]).state,'pending');
 posts=[];
 const activeRequest = {...request('@codex review','2026-10-18T00:03:00Z'),reactions:{eyes:1}};
 client.paginate=async(route)=>{
   if(route.endsWith('/pulls'))return [pull(1)];
   if(route.includes('/issues/comments/'))return [{user:bot,content:'eyes'}];
   if(route.endsWith('/comments'))return [{...summary(),reactions:{eyes:0}},activeRequest];
   return [];
 };
 assert.equal((await refreshPull(client,{owner:'a',repo:'b'},1)).state,'pending');
 assert.ok(posts.every(p=>p.state==='pending'),'invoking-comment reaction must block success');
 console.log('PASS review states, request channels, timestamps, comment reactions, shared SHA and head changes');
})();
