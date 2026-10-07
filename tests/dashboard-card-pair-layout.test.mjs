import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('nutrition-off injected styles give both unwrapped cards the same size and spacing', () => {
 let injected;
 vm.runInNewContext(fs.readFileSync('js/dashboard/dashboard-see-more-position-fix.js','utf8'), {document:{getElementById:()=>null,createElement:()=>({}),head:{appendChild:style=>{injected=style.textContent;}}}});
 const rules=[...injected.matchAll(/([^{}]+)\{([^{}]+)\}/g)];
 const shared=rules.find(([_,selectors])=>selectors.includes('data-nutrition-enabled')&&selectors.includes('dashboard-seven-day-sets-card')&&selectors.includes('dashboard-weight-trend-card'));
 assert.ok(shared);
 for(const property of ['height: 148px !important','min-height: 148px !important','max-height: 148px !important','margin-top: 24px !important','align-self: start !important'])assert.ok(shared[2].includes(property),property);
});
