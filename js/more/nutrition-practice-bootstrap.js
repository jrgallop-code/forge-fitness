// Runs synchronously before any app script inside the practice frame only.
(function () {
 if (window.parent === window || !new URLSearchParams(location.search).has('nutrition-practice')) return;
 try {
  if (!window.name.startsWith('level-up-nutrition-practice:')) throw new Error('Missing practice seed');
  const seed=JSON.parse(window.name.slice('level-up-nutrition-practice:'.length));
  window.name='';
  const memoryStorage=initial=>{
   const values=new Map(Object.entries(initial));
   return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:key=>values.get(String(key))??null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear()};
  };
  Object.defineProperty(window,'localStorage',{value:memoryStorage(seed),configurable:false});
  Object.defineProperty(window,'sessionStorage',{value:memoryStorage({}),configurable:false});
  Object.defineProperty(window,'indexedDB',{value:undefined,configurable:false});
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,options={})=>{
   const url=new URL(typeof input==='string'?input:input.url,location.href);
   const method=String(options.method || input?.method || 'GET').toUpperCase();
   if(url.origin===location.origin && ['GET','HEAD'].includes(method) && !url.pathname.includes('/v1/'))return originalFetch(input,{...options,credentials:'omit'});
   return Promise.resolve(new Response(JSON.stringify({error:'Network actions are unavailable in practice.'}),{status:503,headers:{'Content-Type':'application/json'}}));
  };
  Object.defineProperty(navigator,'sendBeacon',{value:()=>true});
  window.__levelUpNutritionPractice=true;
 } catch(error) {
  // Never run an unisolated app if practice initialization fails.
  document.open();document.write('<p>Practice could not start safely. Close this walkthrough and try again.</p>');document.close();window.stop();
  throw error;
 }
})();
