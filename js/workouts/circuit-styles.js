export function ensureCircuitStyles() {
 if (document.getElementById('circuit-library-styles')) return;
 const link=document.createElement('link');link.id='circuit-library-styles';link.rel='stylesheet';link.href=new URL('../../css/circuit-library.css',import.meta.url).href;document.head.appendChild(link);
}
