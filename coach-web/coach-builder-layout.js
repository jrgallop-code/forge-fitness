/* Existing Level Up Coach bootstrap, with non-destructive Everfit-inspired styling. */
const editor=document.querySelector("#builder .coach-editor-shell"),header=document.getElementById("coach-program-client-plan"),smart=document.getElementById("coach-smart-panel"),builder=document.getElementById("builder");
if(builder&&header&&editor&&smart){header.after(smart);smart.after(editor)}
const smartButton=[...document.querySelectorAll(".coach-editor-actions button")].find(b=>b.textContent.trim()==="Smart Coach");
smartButton?.addEventListener("click",()=>smart?.scrollIntoView({block:"start",behavior:"smooth"}));
document.getElementById("coach-expanded-trigger")?.remove();
import("./coach-self-profile.js").catch(console.error);
import("./coach-nutrition-phase1-placeholder.js").catch(console.error);
import("./coach-functional-profile.js").catch(error=>console.error("Coach client dashboard failed:",error));
import("./coach-ui-polish.js").catch(error=>console.error("Coach visual polish unavailable:",error));
