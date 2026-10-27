// Instagram Login route. Secrets remain in Worker bindings; tokens are encrypted in D1.
const API = 'https://graph.instagram.com/v25.0';
const enc = new TextEncoder();
const now = () => Date.now();
const result = (data,status=200) => ({data,status});
const idValid = v => typeof v === 'string' && /^\d{1,40}$/.test(v);
export function keywordMatches(text, words) {
 const normalized=String(text).normalize('NFKC').toLocaleLowerCase('en');
 return words.some(word=>{const w=word.normalize('NFKC').trim().toLocaleLowerCase('en');
 return w && new RegExp('(?:^|[^\\p{L}\\p{N}_])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^\\p{L}\\p{N}_])','u').test(normalized);});
}
export function validateRule(b) {
 const title=String(b.title||'').trim(), message=String(b.message||'').trim(), routine_url=String(b.routine_url||'').trim();
 const keywords=Array.isArray(b.keywords)?b.keywords.map(x=>String(x).trim()).filter(Boolean):[];
 let link;try{link=new URL(routine_url);}catch{}
 if(!idValid(b.media_id)||!title||title.length>100||!message||!link||link.protocol!=='https:'||link.username||link.password||routine_url.length>500||message.length+routine_url.length+2>900||!keywords.length||keywords.length>20||keywords.some(x=>x.length>50)||String(b.public_reply||'').length>300)throw new Error('Choose a post, add up to 20 keywords, a short message and an HTTPS workout link (900 characters total).');
 return {media_id:b.media_id,title,keywords:JSON.stringify(keywords),message,routine_url,public_reply:String(b.public_reply||'').trim(),enabled:b.enabled===true?1:0};
}
async function graph(env,token,path,method='GET',body) {
 const r=await fetch(`${API}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 const data=await r.json();
 if(!r.ok||data.error) {const code=Number(data.error?.code||r.status),subcode=Number(data.error?.error_subcode)||0;const error=new Error(`Meta request failed (${code}${subcode?'/'+subcode:''}). Check account permissions and connection.`);error.code=code;error.subcode=subcode;throw error;}
 return data;
}
async function key(env) {
 const digest=await crypto.subtle.digest('SHA-256',enc.encode(`level-up-instagram-token-v1:${env.INSTAGRAM_APP_SECRET}`));
 return crypto.subtle.importKey('raw',digest,'AES-GCM',false,['encrypt','decrypt']);
}
export async function seal(value,env) {
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const bytes=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),enc.encode(value)));
 return btoa(String.fromCharCode(...iv,...bytes));
}
export async function unseal(value,env) {
 const bytes=Uint8Array.from(atob(value),x=>x.charCodeAt(0));
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},await key(env),bytes.slice(12)));
}
const connection=env=>env.DB.prepare('SELECT * FROM instagram_connection WHERE id=1').first();
const ready=env=>Boolean(env.INSTAGRAM_APP_ID&&env.INSTAGRAM_APP_SECRET&&env.INSTAGRAM_VERIFY_TOKEN);
const callback='https://api.leveluphypertrophy.com/v1/instagram/callback';
export async function instagramAdmin(request,env,readJson) {
 const url=new URL(request.url), action=url.pathname.slice('/v1/admin/instagram'.length);
 if(action==='/process'&&request.method==='POST') {
  const c=await connection(env);
  if(!ready(env)||!c||!c.subscribed||c.expires_at<=now())return result({error:'Connect Instagram before processing queued replies.'},409);
  try{await instagramScheduled(env,0);return result({ok:true});}
  catch{return result({error:'The reply worker could not run. Reconnect Instagram if the app secret was changed.'},502);}
 }
 if(action==='/status'&&request.method==='GET') {
  const c=await connection(env);
  const {results:rules}=await env.DB.prepare('SELECT * FROM instagram_rules ORDER BY created_at DESC LIMIT 200').all();
  const {results:deliveries}=await env.DB.prepare('SELECT * FROM instagram_deliveries ORDER BY created_at DESC LIMIT 100').all();
  return result({configured:ready(env),connected:Boolean(c&&c.expires_at>now()&&c.subscribed),username:c?.username||'',expiresAt:c?.expires_at||null,rules:rules.map(x=>({...x,keywords:JSON.parse(x.keywords),enabled:Boolean(x.enabled)})),deliveries,callback,webhook:'https://api.leveluphypertrophy.com/v1/instagram/webhook'});
 }
 if(action==='/connect'&&request.method==='POST') {
  if(!ready(env))return result({error:'Meta app setup is pending. Configure Instagram App ID, App Secret and Webhook Verify Token on the Worker first.'},409);
  const state=crypto.randomUUID()+crypto.randomUUID();
  await env.DB.prepare('DELETE FROM instagram_oauth_states WHERE expires_at<?').bind(now()).run();
  await env.DB.prepare('INSERT INTO instagram_oauth_states VALUES(?,?)').bind(state,now()+600000).run();
  const login=new URL('https://www.instagram.com/oauth/authorize');
  for(const [k,v] of Object.entries({client_id:env.INSTAGRAM_APP_ID,redirect_uri:callback,response_type:'code',scope:'instagram_business_basic,instagram_business_manage_comments',state,enable_fb_login:'0',force_authentication:'1'}))login.searchParams.set(k,v);
  return result({url:login.href});
 }
 if(action==='/posts'&&request.method==='GET') {
  const c=await connection(env);if(!c||c.expires_at<=now())return result({error:'Connect Instagram first.'},409);
  const after=url.searchParams.get('after');
  const posts=await graph(env,await unseal(c.token_cipher,env),`${c.account_id}/media?fields=id,caption,permalink,media_type,timestamp&limit=50${after?'&after='+encodeURIComponent(after):''}`);
  return result({posts:posts.data||[],after:posts.paging?.next?posts.paging.cursors?.after:null});
 }
 const edit=action.match(/^\/rules\/([0-9a-f-]{36})$/);
 if((action==='/rules'&&request.method==='POST')||(edit&&request.method==='PUT')) {
  let rule;try{rule=validateRule(await readJson(request,8192));}catch(e){return result({error:e.message},400);}
  const c=await connection(env);
  if(rule.enabled&&(!c||c.expires_at<=now()||!c.subscribed))return result({error:'Connect Instagram before enabling a rule. You can save a paused rule now.'},409);
  if(c){
   // The account's media edge is the same source as the post picker. Media.owner
   // may be absent or use a different ID representation from the login subject.
   const token=await unseal(c.token_cipher,env);
   let after='',owned=false,complete=false;
   const seen=new Set();
   for(let page=0;page<20;page++){
    const media=await graph(env,token,`${c.account_id}/media?fields=id&limit=100${after?'&after='+encodeURIComponent(after):''}`);
    if((media.data||[]).some(post=>String(post.id)===rule.media_id)){owned=true;break;}
    const next=media.paging?.next?media.paging?.cursors?.after:null;
    if(!next){complete=true;break;}
    if(seen.has(next))break;
    seen.add(next);after=next;
   }
   if(!owned)return result({error:complete?'Choose a post from your connected Instagram account. Refresh the post list and try again.':'This older post could not be verified yet. Choose a more recent post and try again.'},complete?400:409);
  }
  const id=edit?edit[1]:crypto.randomUUID();
  if(edit){
   const existing=await env.DB.prepare('SELECT id FROM instagram_rules WHERE id=?').bind(id).first();
   if(!existing)return result({error:'Rule not found.'},404);
   await env.DB.prepare('UPDATE instagram_rules SET media_id=?,title=?,keywords=?,message=?,routine_url=?,public_reply=?,enabled=? WHERE id=?').bind(rule.media_id,rule.title,rule.keywords,rule.message,rule.routine_url,rule.public_reply,rule.enabled,id).run();
  }else await env.DB.prepare('INSERT INTO instagram_rules VALUES(?,?,?,?,?,?,?,?,?)').bind(id,rule.media_id,rule.title,rule.keywords,rule.message,rule.routine_url,rule.public_reply,rule.enabled,now()).run();
  return result({id},edit?200:201);
 }
 const match=action.match(/^\/rules\/([0-9a-f-]{36})$/);
 if(match&&request.method==='PATCH') {
  const b=await readJson(request,1024);if(typeof b.enabled!=='boolean')return result({error:'Provide enabled.'},400);
  const c=await connection(env);if(b.enabled&&(!c||!c.subscribed||c.expires_at<=now()))return result({error:'Connect Instagram first.'},409);
  await env.DB.prepare('UPDATE instagram_rules SET enabled=? WHERE id=?').bind(b.enabled?1:0,match[1]).run();return result({ok:true});
 }
 if(action==='/disconnect'&&request.method==='POST') {
  const c=await connection(env);
  if(c)await graph(env,await unseal(c.token_cipher,env),`${c.account_id}/subscribed_apps`,'DELETE');
  await env.DB.batch([env.DB.prepare('UPDATE instagram_rules SET enabled=0'),env.DB.prepare('DELETE FROM instagram_connection')]);
  return result({ok:true});
 }
 return result({error:'Not found.'},404);
}
export async function instagramCallback(request,env) {
 const url=new URL(request.url),state=url.searchParams.get('state');
 const used=await env.DB.prepare('DELETE FROM instagram_oauth_states WHERE state=? AND expires_at>? RETURNING state').bind(state||'',now()).first();
 if(!used)return new Response('Connection expired. Return to the owner console and connect again.',{status:400});
 if(url.searchParams.has('error')||!url.searchParams.get('code'))return new Response('Instagram connection was cancelled.',{status:400});
 try {
  const shortResponse=await fetch('https://api.instagram.com/oauth/access_token',{method:'POST',body:new URLSearchParams({client_id:env.INSTAGRAM_APP_ID,client_secret:env.INSTAGRAM_APP_SECRET,grant_type:'authorization_code',redirect_uri:callback,code:url.searchParams.get('code')}),signal:AbortSignal.timeout(15000)});
  const short=await shortResponse.json();if(!shortResponse.ok||!short.access_token)throw new Error();
  const exchange=new URL('https://graph.instagram.com/access_token');for(const [k,v]of Object.entries({grant_type:'ig_exchange_token',client_secret:env.INSTAGRAM_APP_SECRET,access_token:short.access_token}))exchange.searchParams.set(k,v);
  const longResponse=await fetch(exchange,{signal:AbortSignal.timeout(15000)}),long=await longResponse.json();if(!longResponse.ok||!long.access_token)throw new Error();
  const profile=await graph(env,long.access_token,'me?fields=user_id,username');
  const account=String(profile.user_id||'');if(!idValid(account))throw new Error();
  const existing=await connection(env);if(existing&&existing.account_id!==account)return new Response('Disconnect the existing Instagram account before switching accounts.',{status:409});
  await graph(env,long.access_token,`${account}/subscribed_apps`,'POST',{subscribed_fields:'comments'});
  await env.DB.prepare('INSERT OR REPLACE INTO instagram_connection VALUES(1,?,?,?,?,?,1)').bind(account,String(profile.username||''),await seal(long.access_token,env),now()+Number(long.expires_in||5184000)*1000,now()).run();
  return new Response(null,{status:303,headers:{Location:'https://app.leveluphypertrophy.com/admin/?instagram=connected','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch{return new Response('Instagram could not be connected. Check the Meta app permissions and try again from the owner console.',{status:502});}
}
export async function validSignature(raw,signature,secret) {
 if(!secret||!/^sha256=[0-9a-f]{64}$/.test(signature||''))return false;
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 return crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.slice(7).match(/../g),x=>parseInt(x,16)),enc.encode(raw));
}
export async function instagramWebhook(request,env,ctx) {
 const url=new URL(request.url);
 if(request.method==='GET')return env.INSTAGRAM_VERIFY_TOKEN&&url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===env.INSTAGRAM_VERIFY_TOKEN?new Response(url.searchParams.get('hub.challenge')||''):new Response('Forbidden',{status:403});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const raw=await request.text();if(raw.length>262144)return new Response('Too large',{status:413});
 if(!await validSignature(raw,request.headers.get('X-Hub-Signature-256'),env.INSTAGRAM_APP_SECRET))return new Response('Forbidden',{status:403});
 let payload;try{payload=JSON.parse(raw);}catch{return new Response('Invalid JSON',{status:400});}
 if(payload.object!=='instagram')return new Response('Ignored');
 const c=await connection(env);if(!c||!c.subscribed||c.expires_at<=now())return new Response('Disconnected');
 const {results:rules}=await env.DB.prepare('SELECT * FROM instagram_rules WHERE enabled=1 ORDER BY created_at,id').all();
 for(const entry of payload.entry||[]) {
  if(String(entry.id)!==c.account_id)continue;
  for(const change of entry.changes||[]) {
   const v=change.value||{};
   if(change.field!=='comments'||!idValid(String(v.id||''))||String(v.from?.id)===c.account_id||v.media?.media_product_type==='LIVE')continue;
   const rule=rules.find(r=>r.media_id===String(v.media?.id)&&keywordMatches(v.text,JSON.parse(r.keywords)));if(!rule)continue;
   await env.DB.prepare('INSERT OR IGNORE INTO instagram_deliveries VALUES(?,?,?,?,?,?,?,?,?)').bind(String(v.id),rule.id,c.account_id,rule.media_id,String(v.from?.username||'').slice(0,100),'queued','',now(),now()).run();
  }
 }
 // Durable rows exist before acknowledgement. Cron drains them even if this request stops.
 if(ctx?.waitUntil)ctx.waitUntil(instagramScheduled(env,0).catch(()=>{console.error('Instagram reply worker failed; queued replies retained.');}));
 return new Response('EVENT_RECEIVED');
}
export async function processDelivery(env,c,row,token) {
 const claimed=await env.DB.prepare("UPDATE instagram_deliveries SET status='checking',updated_at=? WHERE comment_id=? AND status='queued' RETURNING comment_id").bind(now(),row.comment_id).first();if(!claimed)return;
 const finish=(status,detail='')=>env.DB.prepare('UPDATE instagram_deliveries SET status=?,detail=?,updated_at=? WHERE comment_id=?').bind(status,detail,now(),row.comment_id).run();
 const rule=await env.DB.prepare('SELECT * FROM instagram_rules WHERE id=? AND enabled=1').bind(row.rule_id).first();
 if(!rule||row.account_id!==c.account_id)return finish('skipped','Rule paused or account changed.');
 let comment;
 try{comment=await graph(env,token,`${row.comment_id}?fields=id,text,timestamp,media,from`);}catch(e){return finish('failed',`Could not verify the comment.${e.code?' Meta error '+e.code+(e.subcode?'/'+e.subcode:'')+'.':''}`);}
 const age=now()-Date.parse(comment.timestamp);
 if(!Number.isFinite(age)||age< -60000||age>=7*86400000||String(comment.media?.id)!==rule.media_id||String(comment.from?.id)===c.account_id||!keywordMatches(comment.text,JSON.parse(rule.keywords)))return finish('skipped','Comment is ineligible, changed or outside the seven-day window.');
 // Persist before send: an interrupted/ambiguous request is never blindly resent.
 await finish('sending');
 try {
  await graph(env,token,`${c.account_id}/messages`,'POST',{recipient:{comment_id:row.comment_id},message:{text:rule.message+'\n\n'+rule.routine_url}});
 }catch(e){return finish(e.code===429||e.code===4||e.code===32||e.code===613?'queued':'unknown',e.code?'Meta could not confirm delivery. Error '+e.code+(e.subcode?'/'+e.subcode:'')+'.':'Delivery could not be confirmed; not automatically resent.');}
 await finish('sent');
 if(rule.public_reply)try{await graph(env,token,`${row.comment_id}/replies`,'POST',{message:rule.public_reply});}catch{await finish('sent','DM sent; public reply failed.');}
}
export async function instagramScheduled(env,minAgeMs=30000) {
 if(!ready(env))return;
 let c=await connection(env);if(!c||!c.subscribed||c.expires_at<=now())return;
 let token=await unseal(c.token_cipher,env);
 if(now()-c.refreshed_at>7*86400000) {
  const refresh=new URL('https://graph.instagram.com/refresh_access_token');refresh.searchParams.set('grant_type','ig_refresh_token');refresh.searchParams.set('access_token',token);
  try{const r=await fetch(refresh,{signal:AbortSignal.timeout(15000)}),p=await r.json();if(r.ok&&p.access_token){token=p.access_token;await env.DB.prepare('UPDATE instagram_connection SET token_cipher=?,expires_at=?,refreshed_at=? WHERE id=1').bind(await seal(token,env),now()+Number(p.expires_in||5184000)*1000,now()).run();}}catch{/* Remain connected until actual expiry; dashboard shows expiry. */}
 }
 await env.DB.prepare("UPDATE instagram_deliveries SET status='unknown',detail='Interrupted send; not resent automatically.' WHERE status='sending' AND updated_at<?").bind(now()-600000).run();
 await env.DB.prepare("UPDATE instagram_deliveries SET status='queued' WHERE status='checking' AND updated_at<?").bind(now()-600000).run();
 const {results}=await env.DB.prepare("SELECT * FROM instagram_deliveries WHERE status='queued' AND updated_at<=? ORDER BY created_at LIMIT 10").bind(now()-minAgeMs).all();
 for(const row of results)await processDelivery(env,c,row,token);
 await env.DB.prepare('DELETE FROM instagram_deliveries WHERE created_at<?').bind(now()-90*86400000).run();
 await env.DB.prepare('DELETE FROM instagram_oauth_states WHERE expires_at<?').bind(now()).run();
}
