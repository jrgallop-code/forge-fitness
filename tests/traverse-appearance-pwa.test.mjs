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
const splashStyle = read("css/pwa-splash-screen.css");
const splashSpin = read("css/pwa-splash-spin.css");

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
  assert.match(css, /html\[data-theme="traverse"\] body > \.ios-quick-log-nav > span/);
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
  assert.match(html,/appearance-themes\.css\?v=traverse-splash-20261124/);
  assert.match(html,/app\.js\?v=traverse-pwa-20261124/);
  assert.match(worker,/CACHE_VERSION = "traverse-macros-20261124"/);
});

test("Traverse visibly uses terracotta on PWA actions and highlights",()=>{
  assert.match(css,/html\[data-theme="traverse"\] body > \.ios-quick-log-nav > span/);
  assert.match(css,/background:var\(--traverse-terracotta\)!important/);
  assert.match(css,/\.dashboard-command-weekly \.dashboard-weekly-toggle button\.active/);
  assert.match(css,/\.dashboard-macro-progress--fat > i > b/);
  assert.match(css,/\.dashboard-habit-card--checkins/);
  assert.match(css,/\.dashboard-calorie-arc-overflow/);
  assert.match(css,/--traverse-orange-text:#87471f/);
});

test("Traverse macro charts use green carbs, orange fat and grey protein without highlighting labels",()=>{
  for(const [name,hex] of Object.entries({carbs:"#909962",fat:"#c67e50",protein:"#a4b2b0"})){
    assert.match(css,new RegExp("--traverse-macro-"+name+":"+hex));
    assert.match(css,new RegExp("dashboard-macro-progress--"+name+" \\{ --macro-color:var\\(--traverse-macro-"+name+"\\)!important"));
    assert.match(css,new RegExp("food-macro-total--"+name+" i > b"));
    assert.match(css,new RegExp("calorie-stat-macro--"+name+" \\.calorie-stat-macro-trend i"));
  }
  assert.match(css,/\.dashboard-macro-summary \.dashboard-macro-progress > span/);
  assert.match(css,/background:transparent!important/);
  assert.doesNotMatch(css,/dashboard-macro-progress--fat span,\s*html\[data-theme/);
  assert.match(css,/\.macro-goals-layout \{/);
  assert.match(css,/\.food-edit-calorie-ring \{/);
});

test("Traverse splash uses the original collision animation and its colours", () => {
 const rev="traverse-launch-20261124";
 assert.ok(html.includes("pwa-splash-spin.css?v="+rev));
 assert.ok(html.includes("pwa-splash-screen.css?v="+rev));
 assert.ok(html.includes('traverse:"assets/level-up-splash-pure-fullbleed'));
 assert.ok(splashStyle.includes('html[data-theme="traverse"].level-up-installed-pwa #pwa-splash'));
 assert.ok(splashStyle.includes("background:#faf7f1"));
 assert.ok(splashStyle.includes("linear-gradient(90deg,#909962 0%,#c67e50 100%)"));
 assert.ok(splashSpin.includes('html[data-theme="traverse"] #pwa-splash .splash-spin'));
 assert.ok(splashSpin.includes("--spin-ink: #302b2d"));
 assert.ok(splashSpin.includes("--spin-accent: #c67e50"));
 for(const rule of ["level-up-spin-bar","level-up-spin-pop","level-up-spin-name"]) assert.ok(splashSpin.includes(rule));
 assert.ok(splashSpin.includes("rotate(360deg)"));
 assert.ok(worker.includes("splash-spin.css?v="+rev));
});
