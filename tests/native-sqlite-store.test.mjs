import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const store = fs.readFileSync("js/core/native-sqlite-store.js", "utf8");
const login = fs.readFileSync("js/account/first-launch-login.js", "utf8");
const bridge = fs.readFileSync("ios/App/App/LevelUpBridgeViewController.swift", "utf8");
const plugin = fs.readFileSync("ios/App/App/LevelUpSQLiteStorePlugin.swift", "utf8");
const project = fs.readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");

test("iOS startup restores native SQLite data before login recovery", () => {
    assert.match(login, /initializeNativeSQLiteStore/);
    assert.match(login, /finally\(\(\) => initializeFirstLaunchLogin\(\)\)/);
    assert.match(store, /restoreMissingEntries/);
    assert.match(store, /localStorage\.getItem\(key\) !== null/);
});

test("native SQLite mirror excludes auth tokens and persists Level Up data", () => {
    assert.match(store, /level_up_cloud_session/);
    assert.match(store, /DATA_PREFIXES = \["level_up_", "forge_"\]/);
    assert.match(store, /replaceStore\(\{ entries: collectEntries\(\) \}\)/);
    assert.match(store, /Storage\.prototype\.setItem/);
    assert.match(store, /Storage\.prototype\.removeItem/);
});

test("native bridge registers the SQLite plugin and Xcode links sqlite3", () => {
    assert.match(bridge, /LevelUpSQLiteStorePlugin\(\)/);
    assert.match(plugin, /import SQLite3/);
    assert.match(plugin, /PRAGMA journal_mode=WAL/);
    assert.match(plugin, /PRAGMA synchronous=FULL/);
    assert.match(plugin, /BEGIN IMMEDIATE TRANSACTION/);
    assert.match(project, /LevelUpSQLiteStorePlugin\.swift in Sources/);
    assert.match(project, /-lsqlite3/);
});
