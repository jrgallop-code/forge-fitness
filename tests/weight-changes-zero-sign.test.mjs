import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync("js/progress/weight-changes-summary.js","utf8");
const start=source.indexOf("function formatChange("),end=source.indexOf("\n}\n",start)+3;
assert.ok(start>=0&&end>start,"weight-change format function exists");
function formatter(factor=1,unit="lb"){
 const context={displayMass:(value,digits=1)=>Number((value*factor).toFixed(digits)),massUnit:()=>unit,Number,Math};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+"\nglobalThis.fmt=formatChange;",context);
 return context.fmt;
}
test("rounded zero never carries a negative or positive sign",()=>{
 const fmt=formatter();
 for(const value of [-0.049,-0.000001,-0,0,0.00001,0.049]){
  assert.equal(fmt(value),"0.0 lb");
 }
});
test("visible changes preserve their proper sign",()=>{
 const fmt=formatter();
 assert.equal(fmt(-0.16),"−0.2 lb");
 assert.equal(fmt(0.21),"+0.2 lb");
 assert.equal(fmt(-1.1),"−1.1 lb");
 assert.equal(fmt(1.1),"+1.1 lb");
 assert.equal(fmt(NaN),"—");
});
test("zero guard applies in metric and large negative differences keep sign",()=>{
 const fmt=formatter(0.453592,"kg");
 assert.equal(fmt(-0.03),"0.0 kg");
 assert.equal(fmt(-0.3),"−0.1 kg");
});
