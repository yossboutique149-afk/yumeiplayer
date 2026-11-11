/**
 * AI provider resolution shared by the server (real calls) and the Studio UI
 * (labels only). Nothing here ever logs or returns a key value: the server
 * reports the *name* of the variable that supplied it, never the secret.
 *
 * Supported shapes:
 *   - OpenAI-compatible chat completions (OpenAI, OpenRouter, Groq, DeepSeek,
 *     Mistral, Together, xAI and any custom AI_BASE_URL gateway)
 *   - Google Gemini generateContent
 *   - Anthropic messages
 *
 * Precedence: AI_API_KEY (with optional AI_BASE_URL / AI_MODEL) wins, then
 * AI_PROVIDER forces a specific provider, then the first detected key.
 */

export const AI_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    keyVar: "AI_API_KEY",
    altKeys: ["OPENAI_API_KEY"],
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    jsonMode: true
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    keyVar: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    jsonMode: true
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    keyVar: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    jsonMode: true
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    keyVar: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    jsonMode: true
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai",
    keyVar: "MISTRAL_API_KEY",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-large-latest",
    jsonMode: true
  },
  {
    id: "together",
    label: "Together AI",
    kind: "openai",
    keyVar: "TOGETHER_API_KEY",
    baseUrl: "https://api.together.xyz/v1",
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    jsonMode: true
  },
  {
    id: "xai",
    label: "xAI",
    kind: "openai",
    keyVar: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    model: "grok-2-latest",
    jsonMode: true
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "gemini",
    keyVar: "GEMINI_API_KEY",
    altKeys: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
    jsonMode: false
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    keyVar: "ANTHROPIC_API_KEY",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-5-haiku-latest",
    jsonMode: false
  }
];

/** Every environment variable name the AI writer can read, in UI order. */
export const AI_KEY_VARS = AI_PROVIDERS.flatMap(provider => [
  provider.keyVar,
  ...(provider.altKeys || [])
]);

const ANTHROPIC_VERSION = "2023-06-01";

function read(env, name) {
  const value = typeof env === "function" ? env(name) : env?.[name];
  return String(value || "").trim();
}

function firstKey(env, provider) {
  const names = [provider.keyVar, ...(provider.altKeys || [])];
  for (const name of names) {
    if (read(env, name)) return { keyVar: name, key: read(env, name) };
  }
  return null;
}

/**
 * Resolves which provider will be used.
 * @returns {{id:string,label:string,kind:string,keyVar:string,key:string,baseUrl:string,model:string,jsonMode:boolean}|null}
 */
export function resolveAIProvider(env) {
  const forced = read(env, "AI_PROVIDER").toLowerCase();
  const modelOverride = read(env, "AI_MODEL");
  const baseOverride = read(env, "AI_BASE_URL");

  const build = (provider, found) => {
    const base = baseOverride || provider.baseUrl;
    return {
      id: provider.id,
      label: provider.label,
      kind: provider.kind,
      keyVar: found.keyVar,
      key: found.key,
      baseUrl: String(base).replace(/\/+$/, ""),
      model: modelOverride || provider.model,
      jsonMode: provider.jsonMode
    };
  };

  // An explicit AI_PROVIDER wins over plain key detection, so a machine with
  // several keys never silently bills the wrong account.
  if (forced) {
    const provider = AI_PROVIDERS.find(item => item.id === forced);
    if (provider) {
      const found = firstKey(env, provider);
      if (found) return build(provider, found);
    }
  }

  // AI_API_KEY is the documented name: it always means "OpenAI-compatible".
  const generic = read(env, "AI_API_KEY");
  if (generic) {
    const openai = AI_PROVIDERS.find(item => item.id === "openai");
    return build(openai, { keyVar: "AI_API_KEY", key: generic });
  }

  for (const provider of AI_PROVIDERS) {
    const found = firstKey(env, provider);
    if (found) return build(provider, found);
  }

  return null;
}

/** Public description for /api/integrations/status — never includes the key. */
export function describeAIProvider(provider) {
  if (!provider) {
    return {
      configured: false,
      provider: "",
      label: "",
      model: "",
      keyVar: "",
      acceptedKeys: AI_KEY_VARS
    };
  }
  return {
    configured: true,
    provider: provider.id,
    label: provider.label,
    model: provider.model,
    keyVar: provider.keyVar,
    acceptedKeys: AI_KEY_VARS
  };
}

/** Builds the HTTP request for the resolved provider (no key is logged). */
export function buildAIRequest({ provider, system, user, temperature = 0.7, maxTokens = 6000 }) {
  if (!provider) throw new Error("No AI provider is configured.");

  if (provider.kind === "gemini") {
    return {
      url: `${provider.baseUrl}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(provider.key)}`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json"
          }
        })
      }
    };
  }

  if (provider.kind === "anthropic") {
    return {
      url: `${provider.baseUrl}/messages`,
      init: {
        method: "POST",
        headers: {
          "x-api-key": provider.key,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: user }]
        })
      }
    };
  }

  const body = {
    model: provider.model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };
  if (provider.jsonMode) body.response_format = { type: "json_object" };

  return {
    url: `${provider.baseUrl}/chat/completions`,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  };
}

/** Extracts the assistant text from any supported response shape. */
export function readAIResponse(kind, data) {
  if (kind === "gemini") {
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map(part => part?.text || "").join("").trim();
  }
  if (kind === "anthropic") {
    const blocks = Array.isArray(data?.content) ? data.content : [];
    return blocks
      .filter(block => block?.type === "text")
      .map(block => block.text || "")
      .join("")
      .trim();
  }
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

/** Provider-specific hint shown when a request is rejected. */
export function aiErrorHint(provider, status) {
  if (status === 401 || status === 403) {
    return `Check ${provider?.keyVar || "AI_API_KEY"}: the provider rejected the credential.`;
  }
  if (status === 404) {
    return `Check the model name (${provider?.model || "AI_MODEL"}); the provider did not find it.`;
  }
  if (status === 429) {
    return "The provider rate-limited the request. Wait a moment and try again.";
  }
  return "";
}
