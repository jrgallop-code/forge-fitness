export async function featureBoard(request, env, user, admin, readJson) {
 const url = new URL(request.url), parts = url.pathname.split('/').filter(Boolean), id = parts[2], action = parts[3], commentId = parts[4];
 const reply = (data, status=200) => ({data,status});
 const input = async () => readJson(request, 8192);
 const text = (value,max) => typeof value === 'string' ? value.trim().slice(0,max) : '';
 const name = value => text(value,40).split(/\s+/)[0] || 'Member';
 const get = async () => env.DB.prepare('SELECT * FROM feature_requests WHERE id=?').bind(id).first();
 if (!id && request.method==='GET') {
  const {results} = await env.DB.prepare(`SELECT r.*, u.display_name, (SELECT COUNT(*) FROM feature_votes WHERE request_id=r.id) AS votes, (SELECT COUNT(*) FROM feature_comments WHERE request_id=r.id) AS comments, EXISTS(SELECT 1 FROM feature_votes WHERE request_id=r.id AND user_id=?) AS voted FROM feature_requests r JOIN users u ON u.id=r.user_id WHERE r.published=1 OR r.user_id=? OR ?=1 ORDER BY votes DESC,r.created_at DESC LIMIT 200`).bind(user?.id || '',user?.id || '',admin?1:0).all();
  return reply({requests:results.map(({display_name,user_id,...r})=>({...r,author:name(display_name),own:user_id===user?.id})),admin});
 }
 if (!user) return reply({error:'Sign in under More → Account & Cloud to participate.'},401);
 if (!id && request.method==='POST') {
  const b=await input(), title=text(b.title,120), body=text(b.body,3000);
  if(!title || !body) return reply({error:'Add a title and explain how this feature would help.'},400);
  const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM feature_requests WHERE user_id=? AND created_at>?').bind(user.id,new Date(Date.now()-86400000).toISOString()).first();
  if(recent.n>=5) return reply({error:'Please limit requests to five per day.'},429);
  const newId=crypto.randomUUID(); await env.DB.prepare('INSERT INTO feature_requests(id,user_id,title,body,created_at) VALUES(?,?,?,?,?)').bind(newId,user.id,title,body,new Date().toISOString()).run(); return reply({id:newId},201);
 }
 const r=await get(); if(!r || (!r.published && !admin && r.user_id!==user.id)) return reply({error:'Request not found.'},404);
 if(action==='vote' && request.method==='PUT') {if(!r.published)return reply({error:'Voting opens after review.'},403); const b=await input(); await env.DB.prepare(b.voted ? 'INSERT OR IGNORE INTO feature_votes VALUES(?,?)' : 'DELETE FROM feature_votes WHERE request_id=? AND user_id=?').bind(id,user.id).run();return reply({ok:true});}
 if(!action && request.method==='PATCH') {
  if(!admin)return reply({error:'Admin access required.'},403);const b=await input();
  if(!['Under review','Planned','In progress','Released'].includes(b.status))return reply({error:'Invalid status.'},400);
  await env.DB.prepare('UPDATE feature_requests SET status=?,published=? WHERE id=?').bind(b.status,b.published?1:0,id).run();return reply({ok:true});
 }
 if(action==='comments' && request.method==='GET') {
  const {results}=await env.DB.prepare('SELECT c.*,u.display_name,u.email,(SELECT COUNT(*) FROM feature_reports WHERE comment_id=c.id) AS reports FROM feature_comments c JOIN users u ON u.id=c.user_id WHERE request_id=? ORDER BY created_at LIMIT 300').bind(id).all();
  const admins=String(env.ADMIN_EMAILS||'').toLowerCase().split(',').map(x=>x.trim());
  return reply({comments:results.map(({email,display_name,user_id,...c})=>({...c,reports:admin?c.reports:undefined,author:name(display_name),developer:admins.includes(String(email).toLowerCase()),own:user_id===user.id})),admin});
 }
 if(action==='comments' && !commentId && request.method==='POST') {
  const b=await input(), body=text(b.body,3000);if(!body)return reply({error:'Write a comment first.'},400);
  const recent=await env.DB.prepare('SELECT COUNT(*) AS n FROM feature_comments WHERE user_id=? AND created_at>?').bind(user.id,new Date(Date.now()-3600000).toISOString()).first();if(recent.n>=30)return reply({error:'Please try again later.'},429);
  if(b.parentId && !await env.DB.prepare('SELECT id FROM feature_comments WHERE id=? AND request_id=?').bind(b.parentId,id).first())return reply({error:'Reply not found.'},400);
  await env.DB.prepare('INSERT INTO feature_comments VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),id,user.id,body,b.parentId||null,new Date().toISOString()).run();return reply({ok:true},201);
 }
 if(action==='comments' && commentId) {
  const c=await env.DB.prepare('SELECT * FROM feature_comments WHERE id=? AND request_id=?').bind(commentId,id).first();if(!c)return reply({error:'Comment not found.'},404);
  if(parts[5]==='report' && request.method==='POST'){await env.DB.prepare('INSERT OR IGNORE INTO feature_reports VALUES(?,?)').bind(commentId,user.id).run();return reply({ok:true});}
  if(!admin && c.user_id!==user.id)return reply({error:'Permission denied.'},403);
  if(request.method==='DELETE'){await env.DB.prepare('DELETE FROM feature_comments WHERE id=?').bind(commentId).run();return reply({ok:true});}
  if(request.method==='PATCH'){const b=await input(), body=text(b.body,3000);if(!body)return reply({error:'Write a comment first.'},400);await env.DB.prepare('UPDATE feature_comments SET body=? WHERE id=?').bind(body,commentId).run();return reply({ok:true});}
 }
 return reply({error:'Not found.'},404);
}
