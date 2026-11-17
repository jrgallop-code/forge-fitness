import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync(new URL("../coach-web/coach-ui-polish.js",import.meta.url),"utf8");
test("single Everfit directory mounts at full Clients width instead of in narrow original directory",()=>{
 assert.match(ui,/clientsSection\.prepend\(root\)/);
 assert.doesNotMatch(ui,/host\.prepend\(root\)/);
 assert.match(ui,/#clients\.luc-single-client-view\{display:flex!important;flex-direction:column!important/);
 assert.match(ui,/#clients\.luc-single-client-view > #luc-everfit-directory/);
 assert.match(ui,/#clients\.luc-single-client-view #cf-detail\{width:100%!important/);
});
test("client profiles retain an explicit Back to clients and are not squeezed into a sidebar",()=>{
 assert.match(ui,/classList\.add\("luc-profile-open"\)/);
 assert.match(ui,/classList\.remove\("luc-profile-open"\)/);
 assert.match(ui,/Back to all clients/);
 assert.match(ui,/#clients\.luc-single-client-view\.luc-profile-open #cf-detail\{display:block!important\}/);
 assert.match(ui,/grid-template-columns:repeat\(auto-fit,minmax\(min\(280px,100%\),1fr\)\)/);
});
test("active tabs are readable with dark ink on a pale blue surface",()=>{
 assert.match(ui,/#clients \.cf-tabs button\.active,/);
 assert.match(ui,/#clients \[role="tab"\]\[aria-selected="true"\]/);
 assert.match(ui,/background:#e6efff!important;color:#173b72!important/);
 assert.match(ui,/#clients \.cf-tabs button\.active \*/);
});
test("existing invitations still open original invite form rather than separate duplicate list",()=>{
 assert.match(ui,/luc-invite-open/);
 assert.match(ui,/cf-invite-form/);
 assert.match(ui,/data-revoke/);
});
