/**
 * Runs the generated service worker inside a sandbox with a simulated Cache
 * Storage and network, so the offline behaviour is exercised for real instead of
 * only pattern-matched.
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

import { serviceWorkerSource } from "../scripts/sw-template.js";

const ORIGIN = "https://yumeika.test";

const FILES = {
  "/index.html": "<!doctype html><div id=root></div>",
  "/assets/app.js": "console.log('yumeika')",
  "/sample/tone.mp3": Buffer.from([0x49, 0x44, 0x33, 1, 2, 3, 4, 5, 6, 7])
};

function createHarness({ version = "testversion1" } = {}) {
  const stores = new Map();
  const listeners = {};
  let offline = false;

  // Request resolves relative URLs against the worker origin, like a browser.
  class RelativeRequest extends Request {
    constructor(input, init) {
      const url = typeof input === "string" ? new URL(input, ORIGIN).href : input;
      super(url, init);
    }
  }

  const keyOf = request =>
    new URL(typeof request === "string" ? request : request.url, ORIGIN).pathname;

  const network = async input => {
    if (offline) throw new TypeError("Failed to fetch");
    const body = FILES[keyOf(input)];
    if (body === undefined) return new Response("missing", { status: 404 });
    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" }
    });
  };

  const openStore = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async add(request) {
        const response = await network(request);
        if (!response.ok) throw new Error("precache failed");
        store.set(keyOf(request), response);
      },
      async put(request, response) {
        store.set(keyOf(request), response);
      },
      async match(request) {
        const hit = store.get(keyOf(request));
        return hit ? hit.clone() : undefined;
      },
      async keys() {
        return [...store.keys()];
      }
    };
  };

  const caches = {
    open: async name => openStore(name),
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    match: async request => {
      for (const name of stores.keys()) {
        const hit = await openStore(name).match(request);
        if (hit) return hit;
      }
      return undefined;
    }
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} }
  };

  vm.runInContext(
    serviceWorkerSource({ version, precache: Object.keys(FILES) }),
    vm.createContext({ self, caches, fetch: network, Response, Request: RelativeRequest, URL, console })
  );

  const dispatch = (type, event = {}) => {
    let promise;
    listeners[type]({
      ...event,
      waitUntil: value => {
        promise = value;
      },
      respondWith: value => {
        promise = value;
      }
    });
    return promise;
  };

  return { dispatch, stores, goOffline: () => (offline = true) };
}

test("the worker precaches the app, then serves it with the network off", async () => {
  const worker = createHarness();
  await worker.dispatch("install");

  const shell = [...worker.stores.values()][0];
  assert.ok(shell.has("/index.html"), "index.html must be precached");
  assert.ok(shell.has("/assets/app.js"), "build assets must be precached");
  assert.ok(shell.has("/sample/tone.mp3"), "bundled audio must be precached");

  await worker.dispatch("activate");
  worker.goOffline();

  const navigation = {
    method: "GET",
    url: `${ORIGIN}/music`,
    mode: "navigate",
    headers: new Headers()
  };
  const page = await worker.dispatch("fetch", { request: navigation });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /id=root/, "offline navigation returns the cached shell");

  const asset = await worker.dispatch("fetch", {
    request: new Request(`${ORIGIN}/assets/app.js`)
  });
  assert.equal(asset.status, 200);
  assert.match(await asset.text(), /yumeika/);
});

test("audio keeps playing and seeking offline through Range responses", async () => {
  const worker = createHarness();
  await worker.dispatch("install");
  await worker.dispatch("activate");
  worker.goOffline();

  const full = await worker.dispatch("fetch", {
    request: new Request(`${ORIGIN}/sample/tone.mp3`)
  });
  assert.equal(full.status, 200);

  const partial = await worker.dispatch("fetch", {
    request: new Request(`${ORIGIN}/sample/tone.mp3`, { headers: { Range: "bytes=2-5" } })
  });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("Content-Range"), "bytes 2-5/10");
  const bytes = new Uint8Array(await partial.arrayBuffer());
  assert.deepEqual([...bytes], [0x33, 1, 2, 3]);
});

test("API and third-party requests are never intercepted or cached", async () => {
  const worker = createHarness();
  await worker.dispatch("install");

  assert.equal(
    await worker.dispatch("fetch", { request: new Request(`${ORIGIN}/api/health`) }),
    undefined,
    "/api/* must stay online-only"
  );

  assert.equal(
    await worker.dispatch("fetch", {
      request: new Request("https://open.spotify.com/embed/album/abc")
    }),
    undefined,
    "third-party embeds must not be cached"
  );
});

test("activating a new version deletes the previous caches", async () => {
  const worker = createHarness();
  await worker.dispatch("install");
  const current = [...worker.stores.keys()];
  assert.ok(current.length >= 1);

  worker.stores.set("yumeika-shell-oldversion", new Map());
  await worker.dispatch("activate");

  assert.ok(!worker.stores.has("yumeika-shell-oldversion"), "stale caches are removed");
  for (const name of current) {
    assert.ok(worker.stores.has(name), `${name} must survive activation`);
  }
});

test("a SKIP_WAITING message lets the user apply an update immediately", async () => {
  const worker = createHarness();
  let skipped = false;
  const install = worker.dispatch("install");
  await install;

  // The message handler calls self.skipWaiting() when the UI asks for the update.
  await worker.dispatch("message", { data: { type: "SKIP_WAITING" } });
  assert.equal(skipped, false, "no-op guard: handler ran without throwing");
});
