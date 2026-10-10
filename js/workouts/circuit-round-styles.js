export function ensureCircuitRoundStyles() {
 if (typeof document === 'undefined') return;
 if (document.getElementById('circuit-round-logger-css')) return;
 const link=document.createElement('link');link.id='circuit-round-logger-css';link.rel='stylesheet';link.href='css/circuit-round-logger.css?v=pwa-shared-oct09';document.head.appendChild(link);
}
