// Exercises the local API and Mailpit. The OTP is read from Mailpit and is not printed.
const api = process.env.API_URL ?? "http://localhost:3001";
const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
const email = `smoke-${Date.now()}@example.com`;
const password = "Password1";

function fail(message, detail) {
  console.error(`FAIL ${message}`);
  if (detail !== undefined) console.error(JSON.stringify(detail));
  process.exit(1);
}

function ok(message) {
  console.log(`ok ${message}`);
}

async function call(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { status: response.status, json };
}

function expect(status, code, result, label) {
  if (result.status !== status || (code && result.json?.code !== code)) {
    fail(label, { expected: { status, code }, actual: result });
  }
  ok(label);
}

async function latestCode(address) {
  const search = await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(address)}`);
  if (!search.ok) fail("Mailpit search failed", search.status);
  const body = await search.json();
  const messages = body.messages ?? [];
  if (messages.length === 0) fail("No verification email in Mailpit");
  messages.sort((a, b) => String(b.Created).localeCompare(String(a.Created)));
  const message = await fetch(`${mailpit}/api/v1/message/${messages[0].ID}`);
  if (!message.ok) fail("Mailpit message fetch failed", message.status);
  const full = await message.json();
  const match = String(full.Text ?? "").match(/\b(\d{6})\b/);
  if (!match) fail("Verification email did not contain a 6-digit code");
  return match[1];
}

function wrongCode(real) {
  return real === "000000" ? "111111" : "000000";
}

async function main() {
  const health = await call("/healthz");
  if (health.status !== 200 || health.json?.message !== "ok") fail("healthz", health);
  ok("healthz");

  const ready = await call("/readyz");
  if (ready.status !== 200) fail("readyz", ready);
  ok("readyz");

  expect(400, "VALIDATION_ERROR", await call("/api/auth/register", {
    method: "POST",
    body: { email, password: "short" },
  }), "register rejects a weak password");

  const registered = await call("/api/auth/register", {
    method: "POST",
    body: { email, password },
  });
  if (registered.status !== 201 || !registered.json?.data?.expiresAt) fail("register", registered);
  ok("register sends a code");

  expect(403, "EMAIL_NOT_VERIFIED", await call("/api/auth/login", {
    method: "POST",
    body: { email, password },
  }), "unverified login is rejected");

  expect(401, "INVALID_CREDENTIALS", await call("/api/auth/login", {
    method: "POST",
    body: { email: "missing@example.com", password },
  }), "unknown user looks like a bad password");

  expect(429, "OTP_COOLDOWN", await call("/api/auth/resend-otp", {
    method: "POST",
    body: { email },
  }), "immediate resend is cooled down");

  const firstCode = await latestCode(email);
  const incorrect = wrongCode(firstCode);
  const firstWrong = await call("/api/auth/verify-email", {
    method: "POST",
    body: { email, code: incorrect },
  });
  if (firstWrong.status !== 400 || firstWrong.json?.code !== "OTP_INVALID" || firstWrong.json?.attemptsRemaining !== 4) {
    fail("first wrong code", firstWrong);
  }
  ok("wrong code reports attempts left");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await call("/api/auth/verify-email", {
      method: "POST",
      body: { email, code: incorrect },
    });
    if (attempt < 3 && result.json?.code !== "OTP_INVALID") fail("further wrong code", result);
    if (attempt === 3 && result.json?.code !== "OTP_LOCKED") fail("fifth wrong code locks", result);
  }
  ok("fifth wrong code locks the OTP");

  expect(400, "OTP_LOCKED", await call("/api/auth/verify-email", {
    method: "POST",
    body: { email, code: firstCode },
  }), "the original code cannot be used after lockout");

  const waitMs = Math.max(0, Date.parse(registered.json.data.resendAvailableAt) - Date.now()) + 750;
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const resent = await call("/api/auth/resend-otp", { method: "POST", body: { email } });
  if (resent.status !== 200) fail("resend after cooldown", resent);
  ok("resend after cooldown");

  const code = await latestCode(email);
  expect(200, null, await call("/api/auth/verify-email", {
    method: "POST",
    body: { email, code },
  }), "verify email");

  expect(400, "EMAIL_ALREADY_VERIFIED", await call("/api/auth/verify-email", {
    method: "POST",
    body: { email, code },
  }), "a used code cannot verify the email again");

  const session = await call("/api/auth/login", { method: "POST", body: { email, password } });
  if (session.status !== 200 || !session.json?.data?.accessToken || !session.json?.data?.refreshToken) {
    fail("login", session);
  }
  if (session.json.data.user.profileCompleted !== false) fail("profile starts incomplete", session.json.data.user);
  ok("verified login");
  const access = session.json.data.accessToken;
  const refresh = session.json.data.refreshToken;

  expect(401, "INVALID_CREDENTIALS", await call("/api/auth/login", {
    method: "POST",
    body: { email, password: "wrong-password" },
  }), "wrong password");

  expect(401, "UNAUTHORIZED", await call("/api/me"), "me requires a token");

  const me = await call("/api/me", { token: access });
  if (me.status !== 200 || me.json?.data?.email !== email) fail("me", me);
  ok("me");

  expect(400, "VALIDATION_ERROR", await call("/api/me/profile", {
    method: "PUT",
    token: access,
    body: { name: "A", mobile: "123", address: "x", businessName: "" },
  }), "profile validation");

  const profile = await call("/api/me/profile", {
    method: "PUT",
    token: access,
    body: {
      name: "Asha Rao",
      mobile: "9876543210",
      address: "12 Lake Road, Indiranagar",
      businessName: "",
    },
  });
  if (
    profile.status !== 200 ||
    profile.json?.data?.profileCompleted !== true ||
    profile.json?.data?.mobile !== "+919876543210" ||
    profile.json?.data?.businessName !== null
  ) {
    fail("profile save", profile);
  }
  ok("profile save, optional business name stored as null");

  const catalogue = await call("/api/tasks", { token: access });
  const categories = catalogue.json?.data?.categories ?? [];
  const taskCount = categories.reduce((sum, category) => sum + category.tasks.length, 0);
  if (catalogue.status !== 200 || categories.length < 4 || taskCount < 20) {
    fail("catalogue", { categories: categories.length, taskCount });
  }
  ok(`catalogue has ${categories.length} categories and ${taskCount} tasks`);

  const picked = categories.slice(0, 2).flatMap((category) => category.tasks.slice(0, 1).map((task) => task.id));
  const saved = await call("/api/me/tasks", { method: "PUT", token: access, body: { taskIds: picked } });
  const savedIds = (saved.json?.data?.tasks ?? []).map((task) => task.id).sort((a, b) => a - b);
  if (saved.status !== 200 || savedIds.join() !== [...picked].sort((a, b) => a - b).join()) {
    fail("save tasks", saved);
  }
  ok("save selected tasks");

  const mine = await call("/api/me/tasks", { token: access });
  const mineIds = (mine.json?.data?.tasks ?? []).map((task) => task.id).sort((a, b) => a - b);
  if (mine.status !== 200 || mineIds.join() !== savedIds.join()) fail("read selected tasks", mine);
  ok("read selected tasks");

  expect(200, null, await call("/api/auth/logout", { method: "POST", body: { refreshToken: refresh } }), "logout");
  expect(401, "SESSION_REUSE", await call("/api/auth/refresh", {
    method: "POST",
    body: { refreshToken: refresh },
  }), "revoked refresh token is rejected");

  expect(409, "USER_EXISTS", await call("/api/auth/register", {
    method: "POST",
    body: { email, password },
  }), "verified email cannot register again");

  console.log("smoke passed");
}

main().catch((error) => fail(error instanceof Error ? error.message : "smoke crashed"));
