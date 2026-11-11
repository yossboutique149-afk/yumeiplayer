/**
 * Browser client for the privileged server integrations.
 *
 * The studio password lives in sessionStorage only: it is sent to our own
 * endpoints as x-admin-password and never stored in the repository or in
 * localStorage. Provider keys never reach the browser at all.
 */

const PASSWORD_KEY = "yumeika.studio.serverPassword";

export class IntegrationError extends Error {
  constructor(message, { status = 0, missing = [], hint = "" } = {}) {
    super(message);
    this.name = "IntegrationError";
    this.status = status;
    this.missing = missing;
    this.hint = hint;
  }
}

export function getServerPassword() {
  try {
    return sessionStorage.getItem(PASSWORD_KEY) || "";
  } catch {
    return "";
  }
}

export function setServerPassword(value) {
  try {
    if (value) sessionStorage.setItem(PASSWORD_KEY, value);
    else sessionStorage.removeItem(PASSWORD_KEY);
  } catch {
    /* private mode: the password simply is not remembered */
  }
}

async function call(path, { method = "GET", body, password } = {}) {
  const headers = { "Content-Type": "application/json" };
  const secret = password ?? getServerPassword();
  if (secret) headers["x-admin-password"] = secret;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new IntegrationError(
      "No connection to the YUMEIKA server. Check your network and try again."
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON error page */
  }

  if (!response.ok) {
    throw new IntegrationError(data?.error || `The server answered ${response.status}.`, {
      status: response.status,
      missing: Array.isArray(data?.missing) ? data.missing : [],
      hint: data?.hint || ""
    });
  }

  return data;
}

export function fetchIntegrationStatus() {
  return call("/api/integrations/status");
}

export function importSpotifyCatalog({ artistId, password } = {}) {
  return call("/api/spotify/import", { method: "POST", body: { artistId }, password });
}

export function generateSongStudy({ song, language = "ja", notes = "", password } = {}) {
  return call("/api/ai/study", {
    method: "POST",
    body: { song, language, notes },
    password
  });
}
