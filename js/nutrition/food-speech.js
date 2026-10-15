// One recording owns its callbacks; cancellation cannot reopen a dismissed review.
export function nativeFoodSpeech(){return typeof window!=='undefined' && window.Capacitor?.isNativePlatform?.() ? window.Capacitor?.Plugins?.LevelUpFoodSpeech : null;}
export function foodSpeechAvailable(){return Boolean(nativeFoodSpeech() || window.SpeechRecognition || window.webkitSpeechRecognition);}
export function createFoodSpeechSession({onText,onEnd,onError,onUtterance=()=>{}}) {
 const native=nativeFoodSpeech(), id=`food-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 let listener,recognition,cancelled=false,ended=false,text='',pending='',limit;
 const utterances=new Set();
 const complete=error=>{if(cancelled||ended)return;ended=true;clearTimeout(limit);void listener?.remove();if(error)onError(error);onEnd(text,pending);};
 return {
  async start(){
   if(native){listener=await native.addListener('speechResult',event=>{if(cancelled||ended||event.sessionID!==id)return;text=event.transcript||'';pending=event.pendingTranscript??text;onText(text);if(event.utteranceText && !utterances.has(event.utteranceID)){utterances.add(event.utteranceID);onUtterance(event.utteranceText);}if(event.final)complete(event.error);});
    if(cancelled){await listener.remove();return;}
    try{await native.start({sessionID:id,locale:navigator.language?.startsWith('en')?navigator.language:'en-CA'});}catch(error){await listener.remove();if(!cancelled)throw error;}
   }else{
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition)throw Error('Voice is unavailable. You can type your meal below.');
    recognition=new Recognition();recognition.lang=navigator.language||'en-CA';recognition.continuous=true;recognition.interimResults=true;
    recognition.onresult=event=>{if(cancelled||ended)return;text=Array.from(event.results,r=>r[0]?.transcript||'').join(' ').trim();pending=Array.from(event.results).filter(r=>!r.isFinal).map(r=>r[0]?.transcript||'').join(' ').trim();onText(text);Array.from(event.results).forEach((r,i)=>{if(r.isFinal&&!utterances.has(i)){utterances.add(i);onUtterance(r[0]?.transcript||'');}});};
    recognition.onerror=event=>{if(!cancelled)onError(event.error==='not-allowed'?'Microphone access was not allowed. Type your meal or enable access in Settings.':'Recording stopped. Review the transcript or try again.');};
    recognition.onend=()=>complete();recognition.start();limit=setTimeout(()=>recognition.stop(),55000);
   }
  },
  stop(){if(native)void native.stop();else recognition?.stop();},
  abort(){cancelled=true;clearTimeout(limit);void listener?.remove();if(native)void native.cancel();else recognition?.abort();}
 };
}
