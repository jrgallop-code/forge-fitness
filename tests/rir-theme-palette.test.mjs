import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const themes = readFileSync("css/appearance-themes.css", "utf8");
const rir = readFileSync("css/drop-set-runtime.css", "utf8");
const guardrail = readFileSync("js/core/workout-theme-guardrail.js", "utf8");

function relativeLuminance(hex) {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? [...value].map(character => character.repeat(2)).join("") : value;
  const channels = [0, 2, 4].map(index => parseInt(normalized.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

test("every appearance defines all five RIR colours and readable foregrounds", () => {
  for (const theme of ["level-up", "arctic", "pure", "ocean", "midnight", "slate", "pulse"]) {
    const start = themes.indexOf(`html[data-theme="${theme}"]`, themes.indexOf("RIR badges use"));
    assert.ok(start >= 0, `${theme} RIR palette should exist`);
    const block = themes.slice(start, themes.indexOf("}", start));
    for (let value = 0; value <= 4; value += 1) {
      assert.match(block, new RegExp(`--rir-${value}:#[0-9a-f]{6}`, "i"));
      assert.match(block, new RegExp(`--rir-${value}-contrast:#[0-9a-f]{3,6}`, "i"));
      const background = block.match(new RegExp(`--rir-${value}:(#[0-9a-f]{6})`, "i"))?.[1];
      const foreground = block.match(new RegExp(`--rir-${value}-contrast:(#[0-9a-f]{3,6})`, "i"))?.[1];
      assert.ok(contrastRatio(background, foreground) >= 4.5, `${theme} RIR ${value} should meet WCAG AA contrast`);
    }
  }
});

test("RIR badges and picker choices consume appearance tokens", () => {
  for (let value = 0; value <= 4; value += 1) {
    assert.match(rir, new RegExp(`data-rir="${value}"[^}]*var\\(--rir-${value}`));
    assert.match(rir, new RegExp(`data-rir-tone="${value}"[^}]*var\\(--rir-${value}`));
  }
  assert.match(rir, /color:var\(--rir-contrast/);
  assert.match(rir, /color:var\(--rir-choice-contrast/);
});

test("RIR preserves the appearance-coloured set circle and uses colour for the halo", () => {
  assert.match(guardrail, /drop-set-menu-trigger\.has-rir[\s\S]*?border-color: var\(--accent\) !important/);
  assert.match(guardrail, /color-mix\(in srgb, var\(--rir-color\) 34%, transparent\)/);
  assert.match(guardrail, /set-rir-options button\.selected[\s\S]*?background: var\(--rir-choice\) !important/);
});
