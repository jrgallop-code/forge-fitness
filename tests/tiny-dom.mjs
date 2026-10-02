export class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.style={};this.dataset={};this.attributes={};this.handlers={};this.textContent='';this.className='';this.inert=false;this.disabled=false;this.title='';this.hidden=false;this.offsetHeight=0;this.clientHeight=0;this.classList={add:c=>{if(!this.className.split(' ').includes(c))this.className+=' '+c},remove:c=>this.className=this.className.split(' ').filter(x=>x!==c).join(' '),contains:c=>this.className.split(' ').includes(c),toggle(){}};}
 get parentElement(){return this.parentNode}
 get previousElementSibling(){if(!this.parentNode)return null;let a=this.parentNode.children.filter(n=>n.tagName!=='#COMMENT');return a[a.indexOf(this)-1]||null}
 get isConnected(){return this.parentNode!==null}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='open')this.open=true; if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v)}
 getAttribute(k){return this.attributes[k]??null}
 removeAttribute(k){delete this.attributes[k];if(k.startsWith('data-'))delete this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]}
 appendChild(n){n.remove();n.parentNode=this;this.children.push(n);return n}
 insertBefore(n,b){n.remove();n.parentNode=this;const i=this.children.indexOf(b);if(i<0)this.children.push(n);else this.children.splice(i,0,n);return n}
 insertAdjacentElement(where,n){if(where!=='afterend')throw Error(where);const a=this.parentNode.children;const next=a[a.indexOf(this)+1];this.parentNode.insertBefore(n,next);}
 replaceWith(n){this.parentNode.insertBefore(n,this);this.remove()}
 remove(){if(this.parentNode){const a=this.parentNode.children;a.splice(a.indexOf(this),1);this.parentNode=null}}
 matches(s){if(s.startsWith('.'))return this.className.split(' ').includes(s.slice(1));if(s.startsWith('[')){let m=s.match(/^\[([^=\]]+)(?:=["']?([^"'\]]+)["']?)?\]$/);if(!m)return false;const value=this.getAttribute(m[1]);return m[2]?value===m[2]:value!==null}return this.tagName.toLowerCase()===s}
 querySelectorAll(s){let selectors=s.split(/\s+/),results=[];const walk=n=>{for(const c of n.children){if(c.matches(selectors.at(-1))){if(selectors.length===1||c.parentNode?.matches(selectors[0]))results.push(c)}walk(c)}};walk(this);return results}
 querySelector(s){return this.querySelectorAll(s)[0]||null}
 closest(s){let n=this;while(n){if(n.matches(s))return n;n=n.parentNode}return null}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)}
 click(){for(const fn of this.handlers.click||[])fn({target:this,preventDefault(){}})}
 focus(){this.focused=true}
 showModal(){this.open=true}
 close(){this.open=false}
 cloneNode(){let e=new Element(this.tagName);e.textContent=this.textContent;e.className=this.className;e.attributes={...this.attributes};e.dataset={...this.dataset};e.disabled=this.disabled;e.title=this.title;return e}
 set innerHTML(s){this.children=[]; if(s.includes('data-close-weight-chart')){const b=new Element('button');b.setAttribute('data-close-weight-chart','');b.textContent='Done';this.appendChild(b);this.appendChild(new Element('strong'));this.appendChild(new Element('span'));}}
}

