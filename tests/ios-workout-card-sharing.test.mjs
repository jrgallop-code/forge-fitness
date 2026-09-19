import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plugin = readFileSync(new URL('../ios/App/App/LevelUpInstagramSharePlugin.swift', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../ios/App/App/LevelUpBridgeViewController.swift', import.meta.url), 'utf8');
const plist = readFileSync(new URL('../ios/App/App/Info.plist', import.meta.url), 'utf8');
const project = readFileSync(new URL('../ios/App/App.xcodeproj/project.pbxproj', import.meta.url), 'utf8');

test('iOS exposes native Instagram Stories and Photos saving for workout cards', () => {
  assert.match(plugin, /jsName = "LevelUpInstagramShare"/);
  assert.match(plugin, /instagram-stories:\/\/share/);
  assert.match(plugin, /com\.instagram\.sharedSticker\.backgroundImage/);
  assert.match(plugin, /PHAssetChangeRequest\.creationRequestForAsset/);
  assert.match(bridge, /registerPluginInstance\(LevelUpInstagramSharePlugin\(\)\)/);
});

test('the iOS target declares and compiles workout-card sharing support', () => {
  assert.match(plist, /LSApplicationQueriesSchemes/);
  assert.match(plist, /instagram-stories/);
  assert.match(plist, /NSPhotoLibraryAddUsageDescription/);
  assert.match(project, /LevelUpInstagramSharePlugin\.swift in Sources/);
});
