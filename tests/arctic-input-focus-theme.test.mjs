import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const native=readFileSync(new URL("../css/native-ios-polish.css",import.meta.url),"utf8");
const appearance=readFileSync(new URL("../css/appearance-themes.css",import.meta.url),"utf8");
test("Arctic theme declares blue accent, not legacy red",()=>{
 assert.match(appearance,/html\[data-theme="arctic"\][\s\S]{0,150}--accent:#1769e0/);
});
test("native focus rings, caret and checkbox use selected appearance tokens",()=>{
 assert.match(native,/outline: 2px solid var\(--accent/);
 assert.match(native,/caret-color: var\(--accent/);
 assert.match(native,/border-color: var\(--accent[^\n]*!important/);
 assert.match(native,/0 0 0 3px var\(--accent-soft/);
 assert.match(native,/accent-color: var\(--accent/);
 assert.doesNotMatch(native,/border-color: rgba\(242, 31, 44, \.78\) !important/);
});
test("iOS weight sheet has an Arctic blue focus guard when present",()=>{
 const file=new URL("../css/ios-quick-log.css",import.meta.url);
 if(!existsSync(file))return;
 const css=readFileSync(file,"utf8");
 assert.match(css,/html\[data-theme="arctic"\] \.ios-quick-log-weight #ios-quick-log-number:focus/);
 assert.match(css,/border-color: var\(--accent, #1769e0\) !important/);
 assert.match(css,/outline: 2px solid var\(--accent, #1769e0\) !important/);
});
