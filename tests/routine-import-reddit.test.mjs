import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: () => null };
const { importFromRedditArchive, redditPostId } = await import("../js/workouts/routine-importer.js?v=reddit-fallback-1");

test("extracts Reddit post IDs without accepting lookalike hosts", () => {
  assert.equal(redditPostId("https://www.reddit.com/r/workout/comments/1ko3tko/example/"), "1ko3tko");
  assert.equal(redditPostId("https://redd.it/1ko3tko"), "1ko3tko");
  assert.equal(redditPostId("https://reddit.example.com/comments/1ko3tko"), null);
});

test("builds candidates from the public Reddit archive fallback", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => new Response(JSON.stringify(String(url).includes("submission")
    ? { data: [{ author: "poster", selftext: "Push Day\nBench Press - 3x8-10" }] }
    : { data: [{ author: "commenter", body: "Pull Day\nLat Pulldown - 3x8-12" }] }), { status: 200 });
  try {
    const result = await importFromRedditArchive("1ko3tko");
    assert.deepEqual(result.candidates.map(item => item.kind), ["post", "comment"]);
    assert.match(result.candidates[0].text, /Bench Press/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
