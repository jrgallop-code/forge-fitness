/* Solo-coach secure proxy for the Everfit-style client roster.
 * Reads the existing encrypted Coach session cookie; never exposes cloud tokens
 * to the browser or grants athlete access before explicit coach consent.
 */
const crypto=require("node:crypto");
const BASE="https://api.leveluphypertrophy.com";
const COOKIE="levelup_coach_dashboard_session";
function session(req){
 try{
  const match=String(req.headers.cookie||"").split(";").map(s=>s.trim()).find(s=>s.startsWith(COOKIE+"="));
  if(!match||!process.env.COACH_SESSION_SECRET)return null;
  const raw=Buffer.from(decodeURIComponent(match.slice(COOKIE.length+1)),"base64url");
  if(raw.length<29)return null;
  const key=crypto.createHash("sha256").update(process.env.COACH_SESSION_SECRET).digest();
  const decipher=crypto.createDecipheriv("aes-256-gcm",key,raw.subarray(0,12));
  decipher.setAuthTag(raw.subarray(12,28));
  const item=JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString());
  return item.until>Date.now()?item.token:null;
 }catch{return null}
}
module.exports=async(req,res)=>{
 res.setHeader("Cache-Control","private,no-store");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("X-Content-Type-Options","nosniff");
 const token=session(req);
 if(!token)return res.status(401).json({error:"Coach session expired. Sign in again."});
 const action=String(req.query?.action||"");
 const method=req.method;
 if(method!=="GET"&&method!=="POST")return res.status(405).json({error:"Method not allowed."});
 if(method==="POST"){
  if(action!=="revoke")return res.status(400).json({error:"Invalid action."});
  // Reject cross-origin requests even if the browser supplies the session cookie.
  const origin=req.headers.origin;
  if(origin){
   let hostname;try{hostname=new URL(origin).host}catch{return res.status(403).json({error:"Origin not allowed."})}
   if(hostname!==req.headers.host)return res.status(403).json({error:"Origin not allowed."});
  }
  const type=String(req.headers["content-type"]||"");
  if(!type.toLowerCase().includes("application/json"))return res.status(415).json({error:"JSON required."});
  const invite=String(req.body?.invitationId||"").trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invite))return res.status(400).json({error:"Invalid invitation identifier."});
  try{
   const upstream=await fetch(BASE+"/v1/coach/invitations/"+encodeURIComponent(invite)+"/revoke",{
    method:"POST",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(16000)
   });
   const body=await upstream.json().catch(()=>({error:"Invalid cloud response."}));
   return res.status(upstream.status).json(body);
  }catch{return res.status(502).json({error:"Could not reach Level Up Cloud."})}
 }
 if(action)return res.status(400).json({error:"Invalid action."});
 try{
  const upstream=await fetch(BASE+"/v1/coach/roster",{
   headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:AbortSignal.timeout(16000)
  });
  const body=await upstream.json().catch(()=>({error:"Invalid cloud response."}));
  return res.status(upstream.status).json(body);
 }catch{return res.status(502).json({error:"Could not reach Level Up Cloud."})}
};
