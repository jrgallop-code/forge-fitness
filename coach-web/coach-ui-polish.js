/* Everfit-inspired interaction polish for existing Level Up Coach.
 * CSS-only enhancements; never replaces, hides or re-mounts the dashboard.
 * Brand remains Level Up blue and all existing sections remain intact.
 */
(()=>{
 "use strict";
 if(document.getElementById("levelup-coach-polish-v1"))return;
 const style=document.createElement("style");
 style.id="levelup-coach-polish-v1";
 style.textContent=`
 /* Shared Level Up Coach tokens */
 #clients,#dashboard{
  --luc-blue:#245ff1;--luc-blue-hover:#174ecf;--luc-ink:#203650;
  --luc-muted:#6e839f;--luc-border:#e3eaf4;--luc-soft:#f6f8fc;
  --luc-shadow:0 3px 14px rgba(34,58,103,.055);
 }
 /* Raise visual quality of the original dashboard without replacing content */
 #dashboard button:not([class*="nav"]):not([class*="tab"]),
 #clients button.cf-button,
 #clients .cf-tabs button,
 #clients .cf-client-sidebar button,
 #clients button.cf-directory-row {
  font-family:inherit;
  font-weight:650;
  border-radius:12px;
  letter-spacing:-.01em;
  transition:background-color .15s ease,border-color .15s ease,box-shadow .15s ease,transform .15s ease;
 }
 #dashboard button:not([class*="nav"]):not([class*="tab"]):focus-visible,
 #clients button:focus-visible,
 #clients input:focus-visible,
 #clients select:focus-visible,
 #clients textarea:focus-visible{
  outline:3px solid rgba(46,117,232,.32);
  outline-offset:2px;
 }
 #dashboard button:not([class*="nav"]):not([class*="tab"]):not(:disabled):hover,
 #clients button.cf-button:not(:disabled):hover,
 #clients button.cf-directory-row:not(:disabled):hover{
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(45,93,155,.12);
 }
 #clients button.cf-button.cf-primary,#clients .cf-client-sidebar button.cf-primary{
  border:1px solid #235de5;
  background:linear-gradient(135deg,#286bf4,#1d54da);
  color:#fff;
  border-radius:12px;
  padding:11px 16px;
  box-shadow:0 3px 9px rgba(40,103,224,.15);
 }
 #clients button.cf-button.cf-primary:hover,#clients .cf-client-sidebar button.cf-primary:hover{
  background:#184bbf;color:#fff;
 }
 #clients button.cf-button.subtle,
 #clients .cf-client-sidebar button.subtle,
 #clients .cf-tabs button{
  border-radius:11px;
  background:#edf3fd;
  color:#285b97;
  border:1px solid #dbe6f5;
 }
 #clients button.cf-button.danger{background:#fff1f3;color:#ae3545;border:1px solid #ffe0e6}
 #clients button.cf-button.link{border:0;background:transparent;color:var(--luc-blue);box-shadow:none}
 #clients .cf-tabs{gap:9px;border:0;flex-wrap:wrap}
 #clients .cf-tabs button{padding:11px 15px;border-radius:999px}
 #clients .cf-tabs button.active{
  background:var(--luc-blue);color:white;border-color:var(--luc-blue);
  box-shadow:0 3px 10px rgba(39,97,212,.17);
 }
 #clients #cf-directory,#clients #cf-detail{min-width:0}
 #clients .cf-directory-head{background:transparent;align-items:center}
 #clients .cf-directory-head h2{letter-spacing:-.025em;font-weight:750}
 #clients .cf-directory-actions{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
 #clients button.cf-directory-row{
  border:1px solid var(--luc-border);
  border-radius:14px;
  padding:15px 16px;
  background:#fff;
  text-align:left;
 }
 #clients button.cf-directory-row:hover{background:#f7faff;border-color:#9fc3f1}
 #clients .cf-directory-avatar{border-radius:12px;background:#e7eeff;color:#1f5adb}
 #clients .cf-directory-status{border-radius:999px;background:#eaf8ef;color:#26724e}
 #clients .cf-card{border-radius:16px;border:1px solid var(--luc-border);box-shadow:var(--luc-shadow)}
 #clients .cf-card header{background:#fafcff}
 #clients .cf-program,#clients .cf-workout-day{border-radius:13px}
 #clients .cf-summary-grid{gap:16px}
 #clients .cf-summary-grid>.cf-card{min-height:0}
 #clients .cf-client-sidebar{border-radius:15px;box-shadow:var(--luc-shadow)}
 #clients .cf-client-sidebar button.cf-client-item{
  display:block;width:100%;text-align:left;border-radius:11px;
  background:transparent;color:#31506f;box-shadow:none;
 }
 #clients .cf-client-sidebar button.cf-client-item.current{
  background:#e8f0ff;color:#1f5ad4;border:1px solid #bcd0fa;
 }
 #clients .cf-client-sidebar button.cf-client-item small{
  display:block;margin-top:3px;color:#7489a3;font-weight:450;
  font-size:10px;overflow-wrap:anywhere;
 }
 #clients .cf-directory-identification small{overflow-wrap:anywhere}
 #clients .cf-client-sidebar input,#clients #cf-directory-search,
 #clients #cf-client,#clients .cf-detail-controls select,
 #clients .cf-field input,#clients .cf-field select,#clients .cf-field textarea{
  border-radius:11px;border:1px solid #cfdbeb;background:#fff;
 }
 #clients .cf-invite-form{
  display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;
  padding:18px;margin:12px 0 18px;background:#fff;
  border:1px solid var(--luc-border);border-radius:16px;box-shadow:var(--luc-shadow);
 }
 #clients .cf-invite-form .cf-between,
 #clients .cf-invite-form>p,
 #clients .cf-invite-form>button{grid-column:1 / -1}
 #clients .cf-invite-form[hidden]{display:none!important}
 #clients .cf-invite-form .cf-between strong{font-size:16px}
 #clients .cf-invite-form button[type="submit"]{justify-self:start}
 /* Compact clickable metrics, softer buttons and consistent charts */
 #clients .cf-metric-section{border-radius:16px;box-shadow:var(--luc-shadow)}
 #clients button.cf-body-metric{
  border-radius:14px;border:1px solid #e1e8f1;
  background:linear-gradient(180deg,#fff 0%,#fbfcff 100%);
  padding:16px;box-shadow:0 1px 4px rgba(29,60,105,.03);
 }
 #clients button.cf-body-metric:hover{
  transform:translateY(-2px);box-shadow:0 8px 24px rgba(35,75,126,.10);
  border-color:#9fbbf2;
 }
 #clients button.cf-body-metric:focus-visible{outline:3px solid rgba(46,117,232,.32)}
 #clients .cf-highlight-tile{border-radius:13px;background:#f7faff}
 #clients .cf-body-metric-title>span{border-radius:999px;padding:5px 9px;background:#e8f0ff;font-weight:650}
 #clients .cf-detail-controls button,#clients .cf-detail-title button{
  border-radius:999px;background:#edf3ff;color:#26569b;
  padding:9px 15px;border:1px solid #dce7f7;
 }
 #clients .cf-detail-metric{border-radius:17px}
 #clients .cf-heatmap-scroll,#clients .cf-anatomy-card{border-radius:14px}
 @media(max-width:760px){
  #clients .cf-invite-form{grid-template-columns:1fr}
  #clients .cf-directory-actions{width:100%}
  #clients .cf-directory-actions button{flex:1}
  #clients .cf-body-metric-grid{grid-template-columns:1fr}
 }
 @media(prefers-reduced-motion:reduce){
  #dashboard button,#clients button{transition:none!important;transform:none!important}
 }
 `;
 document.head.append(style);
})();
