import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(path, "utf8");
const theme = read("js/core/appearance-theme.js");
const css = read("css/appearance-themes.css");
const html = read("index.html");
const app = read("js/app.js");
const more = read("js/more/appearance-settings.js");
const muscle = read("js/core/muscle-map-colors.js");
const worker = read("service-worker.js");

test("Traverse is a persistent, selectable light theme, PWA only", () => {
  assert.match(theme, /id: "traverse", name: "Traverse"[^\n]*mode: "light"/);
  assert.match(theme, /traverse: "#faf7f1"/);
  assert.match(theme, /localStorage\.setItem\(APPEARANCE_STORAGE_KEY/);
  assert.match(more, /APPEARANCE_THEMES\.map\(theme => renderThemeCard/);
  assert.match(more, /applyAppearanceTheme\(theme\)/);
  assert.match(html, /"pulse","traverse"/);
  assert.match(html, /"ocean","traverse"\]\.includes\(r\)/);
  assert.match(html, /themeMode=m/);
  assert.ok(html.indexOf("level_up_appearance_settings") < html.indexOf("css/styles.css"));
});
test("Traverse maps the five user-selected colours onto shared tokens", () => {
  const block = css.match(/html\[data-theme="traverse"\] \{([\s\S]*?)\n\}/)?.[1] || "";
  for (const hex of ["#faf7f1","#909962","#a4b2b0","#302b2d","#c67e50"]) {
    assert.ok(block.includes(hex), `Traverse is missing ${hex}`);
  }
  for(const token of ["--bg","--card","--surface","--text","--accent","--accent-text","--accent-contrast","--nav-bg","--danger","--success"]){
    assert.ok(block.includes(token + ":"), `Missing token ${token}`);
  }
  assert.match(css, /\.theme-preview-traverse\{/);
  assert.match(css, /html\[data-theme="traverse"\] \.bottom-nav/);
  assert.match(css, /html\[data-theme="traverse"\] \.ios-quick-log-nav>span/);
  assert.match(muscle, /traverse: \{ recovery: "#C67E50", sets: "#909962" \}/);
});
test("Traverse contrast remains legible and warnings remain distinct", () => {
  const lum = hex => {
    const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return c[0]*.2126+c[1]*.7152+c[2]*.0722;
  };
  const ratio=(a,b)=>{
    const x=[lum(a),lum(b)].sort((p,q)=>q-p);
    return (x[0]+.05)/(x[1]+.05);
  };
  assert.ok(ratio("#909962","#302b2d")>=4.5,"Sage buttons need charcoal text");
  assert.ok(ratio("#fffdfa","#302b2d")>=4.5);
  assert.ok(ratio("#e9eeee","#575653")>=4.5);
  assert.match(css, /--danger:#cf3444/);
  assert.match(css, /--accent-contrast:#302b2d/);
});
test("new PWA asset revisions invalidate old service-worker cache",()=>{
  assert.match(app,/appearance-theme\.js\?v=traverse-pwa-1/);
  assert.match(html,/appearance-themes\.css\?v=traverse-pwa-20261124/);
  assert.match(html,/app\.js\?v=traverse-pwa-20261124/);
  assert.match(worker,/CACHE_VERSION = "traverse-appearance-20261124"/);
});

test("Traverse visibly uses terracotta on PWA actions and highlights",()=>{
  assert.match(css,/html\[data-theme="traverse"\] body > \.ios-quick-log-nav > span/);
  assert.match(css,/background:var\(--traverse-terracotta\)!important/);
  assert.match(css,/\.dashboard-command-weekly \.dashboard-weekly-toggle button\.active/);
  assert.match(css,/\.dashboard-macro-progress--fat span/);
  assert.match(css,/\.dashboard-habit-card--checkins/);
  assert.match(css,/\.dashboard-calorie-arc-overflow/);
  assert.match(css,/--traverse-orange-text:#87471f/);
});
