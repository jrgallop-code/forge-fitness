/* Keep the client program workflow in a logical top-to-bottom order:
 * client-specific title > coach generator > day selector > workout exercises > SVG.
 * Elements are moved, not cloned, so their existing event handlers stay intact.
 */
const editor=document.querySelector("#builder .coach-editor-shell"),
header=document.getElementById("coach-program-client-plan"),
smart=document.getElementById("coach-smart-panel"),
builder=document.getElementById("builder"),
nutrition=document.getElementById("coach-unified-nutrition"),
footer=document.querySelector("#builder .coach-plan-footer");
if(builder&&header&&editor&&smart){header.after(smart);smart.after(editor)}
const smartButton=[...document.querySelectorAll(".coach-editor-actions button")].find(b=>b.textContent.trim()==="Smart Coach");
if(smartButton){smartButton.addEventListener("click",()=>{smart?.scrollIntoView({block:"start",behavior:"smooth"})})}
function openNutrition(){if(!nutrition)return;const toggle=header?.querySelector('.coach-plan-nutrition-choice input[type="checkbox"]');if(toggle&&!toggle.checked){toggle.checked=true;toggle.dispatchEvent(new Event("change",{bubbles:true}))}nutrition.hidden=false;requestAnimationFrame(()=>nutrition.scrollIntoView({block:"start",behavior:"smooth"}))}
document.addEventListener("levelup:coach-open-nutrition-editor",openNutrition);
if(footer&&nutrition)nutrition.after(footer);
