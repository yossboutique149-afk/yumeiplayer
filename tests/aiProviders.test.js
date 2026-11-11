import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_KEY_VARS,
  aiErrorHint,
  buildAIRequest,
  describeAIProvider,
  readAIResponse,
  resolveAIProvider
} from "../src/lib/aiProviders.js";

const envOf = vars => name => vars[name] || "";

const PROMPT = { system: "SYSTEM RULES", user: "SONG DATA" };

test("no key means no provider", () => {
  assert.equal(resolveAIProvider(envOf({})), null);
  assert.equal(describeAIProvider(null).configured, false);
});

test("AI_API_KEY is treated as an OpenAI-compatible endpoint", () => {
  const provider = resolveAIProvider(envOf({ AI_API_KEY: "sk-1" }));

  assert.equal(provider.id, "openai");
  assert.equal(provider.keyVar, "AI_API_KEY");
  assert.equal(provider.baseUrl, "https://api.openai.com/v1");
  assert.equal(provider.model, "gpt-4o-mini");

  const { url, init } = buildAIRequest({ provider, ...PROMPT });
  assert.equal(url, "https://api.openai.com/v1/chat/completions");
  assert.equal(init.headers.Authorization, "Bearer sk-1");
  const body = JSON.parse(init.body);
  assert.equal(body.messages[0].role, "system");
  assert.deepEqual(body.response_format, { type: "json_object" });
});

test("AI_BASE_URL and AI_MODEL point AI_API_KEY at any gateway", () => {
  const provider = resolveAIProvider(
    envOf({ AI_API_KEY: "sk-2", AI_BASE_URL: "https://gateway.test/v1/", AI_MODEL: "custom-model" })
  );

  assert.equal(provider.baseUrl, "https://gateway.test/v1");
  assert.equal(provider.model, "custom-model");
  assert.equal(buildAIRequest({ provider, ...PROMPT }).url, "https://gateway.test/v1/chat/completions");
});

test("a provider-specific key is detected without any other setting", () => {
  const openai = resolveAIProvider(envOf({ OPENAI_API_KEY: "sk-3" }));
  assert.equal(openai.id, "openai");
  assert.equal(openai.keyVar, "OPENAI_API_KEY");

  const groq = resolveAIProvider(envOf({ GROQ_API_KEY: "gsk-1" }));
  assert.equal(groq.id, "groq");
  assert.equal(groq.baseUrl, "https://api.groq.com/openai/v1");
});

test("Gemini keys build a generateContent request with the key in the URL only", () => {
  const provider = resolveAIProvider(envOf({ GEMINI_API_KEY: "gem-key" }));
  assert.equal(provider.kind, "gemini");

  const { url, init } = buildAIRequest({ provider, ...PROMPT });
  assert.match(url, /:generateContent\?key=gem-key$/);
  assert.equal(init.headers.Authorization, undefined, "Gemini does not use a bearer header");

  const body = JSON.parse(init.body);
  assert.equal(body.systemInstruction.parts[0].text, "SYSTEM RULES");
  assert.equal(body.contents[0].parts[0].text, "SONG DATA");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(init.body.includes("gem-key"), false, "the key never appears in the body");
});

test("Anthropic keys build a messages request with its own headers", () => {
  const provider = resolveAIProvider(envOf({ ANTHROPIC_API_KEY: "ant-1" }));
  assert.equal(provider.kind, "anthropic");

  const { url, init } = buildAIRequest({ provider, ...PROMPT });
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(init.headers["x-api-key"], "ant-1");
  assert.equal(init.headers["anthropic-version"], "2023-06-01");

  const body = JSON.parse(init.body);
  assert.equal(body.system, "SYSTEM RULES");
  assert.deepEqual(body.messages, [{ role: "user", content: "SONG DATA" }]);
});

test("AI_PROVIDER wins over a generic key so the wrong account is never billed", () => {
  const provider = resolveAIProvider(
    envOf({ AI_API_KEY: "sk-generic", GEMINI_API_KEY: "gem-key", AI_PROVIDER: "gemini" })
  );
  assert.equal(provider.id, "gemini");
  assert.equal(provider.keyVar, "GEMINI_API_KEY");
});

test("assistant text is read from all three response shapes", () => {
  assert.equal(
    readAIResponse("openai", { choices: [{ message: { content: " {\"a\":1} " } }] }),
    "{\"a\":1}"
  );
  assert.equal(
    readAIResponse("gemini", {
      candidates: [{ content: { parts: [{ text: "{\"b\":" }, { text: "2}" }] } }]
    }),
    "{\"b\":2}"
  );
  assert.equal(
    readAIResponse("anthropic", {
      content: [{ type: "text", text: "{\"c\":3}" }, { type: "tool_use", id: "x" }]
    }),
    "{\"c\":3}"
  );
  assert.equal(readAIResponse("openai", {}), "");
});

test("the public status description never carries the secret", () => {
  const provider = resolveAIProvider(envOf({ ANTHROPIC_API_KEY: "ant-secret" }));
  const described = describeAIProvider(provider);
  const serialized = JSON.stringify(described);

  assert.equal(described.configured, true);
  assert.equal(described.keyVar, "ANTHROPIC_API_KEY");
  assert.equal(serialized.includes("ant-secret"), false);
  assert.deepEqual(described.acceptedKeys, AI_KEY_VARS);
});

test("error hints name the variable that has to be checked", () => {
  const provider = resolveAIProvider(envOf({ GEMINI_API_KEY: "k" }));
  assert.match(aiErrorHint(provider, 401), /GEMINI_API_KEY/);
  assert.match(aiErrorHint(provider, 404), /model/i);
  assert.match(aiErrorHint(provider, 429), /rate/i);
  assert.equal(aiErrorHint(provider, 500), "");
});
