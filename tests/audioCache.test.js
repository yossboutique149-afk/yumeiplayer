import test from "node:test";
import assert from "node:assert/strict";
import {
  cachedAudioBytes,
  isAudioCacheSupported,
  planAudioRestore
} from "../src/lib/audioCache.js";

test("planAudioRestore finds the cached tracks the server lost", () => {
  const plan = planAudioRestore(
    [{ name: "1-a.mp3" }, { name: "2-b.mp3" }],
    [{ name: "1-a.mp3" }, { name: "2-b.mp3" }, { name: "3-c.mp3" }]
  );
  assert.deepEqual(plan.missing, ["3-c.mp3"]);
  assert.equal(plan.total, 3);
  assert.equal(plan.present, 2);
});

test("planAudioRestore asks for everything when the server is empty", () => {
  const plan = planAudioRestore([], ["1-a.mp3", "2-b.mp3"]);
  assert.deepEqual(plan.missing, ["1-a.mp3", "2-b.mp3"]);
  assert.equal(plan.present, 0);
});

test("planAudioRestore stays quiet when the server already has the tracks", () => {
  const plan = planAudioRestore(["1-a.mp3"], ["1-a.mp3"]);
  assert.deepEqual(plan.missing, []);
  assert.equal(plan.present, 1);
});

test("planAudioRestore tolerates empty input and repeated names", () => {
  assert.deepEqual(planAudioRestore().missing, []);
  assert.deepEqual(planAudioRestore(null, null).missing, []);
  assert.deepEqual(planAudioRestore([], ["a.mp3", "a.mp3"]).missing, ["a.mp3"]);
  assert.deepEqual(planAudioRestore([{ name: "" }], [{ name: "" }]).missing, []);
});

test("cachedAudioBytes adds the size of every stored track", () => {
  assert.equal(cachedAudioBytes([{ size: 1000 }, { size: "2500" }]), 3500);
  assert.equal(cachedAudioBytes([{ size: "not a number" }]), 0);
  assert.equal(cachedAudioBytes(), 0);
});

test("a runtime without IndexedDB reports no support instead of throwing", () => {
  assert.equal(isAudioCacheSupported(), false);
});
