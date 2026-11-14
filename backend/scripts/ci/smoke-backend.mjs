// Test de fumée d'un backend DÉJÀ démarré : santé, base, inscription, connexion, notifications (liste, compteur,
// marquage lu). Usage : node scripts/ci/smoke-backend.mjs http://127.0.0.1:4300  [--expect-version]
// Crée un compte jetable (e-mail @smoke.test) ; à n'utiliser que contre une base locale de simulation.
const base = (process.argv[2] ?? "").replace(/\/$/, "");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) {
  console.error("REFUS : le test de fumée ne vise que localhost / 127.0.0.1.");
  process.exit(2);
}
let failed = 0;
const check = (name, cond, detail = "") => {
  console.log(`  ${cond ? "✔" : "✘"} ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failed++;
};
const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};

const h = await call("GET", "/api/health");
check("GET /api/health", h.status === 200 && h.json?.status === "ok");
const hd = await call("GET", "/api/health/db");
check("GET /api/health/db (base joignable)", hd.status === 200 && hd.json?.db === "connected");

const id = Date.now().toString(36);
const creds = { email: `smoke-${id}@smoke.test`, password: "Sm0ke-Test-Passw0rd!" };
const reg = await call("POST", "/api/auth/register", {
  body: { ...creds, pseudo: `smoke_${id}`.slice(0, 30), birthDate: "1990-01-01", gender: "AUTRE", city: "Lyon", acceptedTerms: true, acceptedCommunityRules: true },
});
check("POST /api/auth/register", reg.status === 201 || reg.status === 200, `statut ${reg.status}`);
const login = await call("POST", "/api/auth/login", { body: creds });
const token = login.json?.data?.accessToken ?? login.json?.accessToken ?? login.json?.data?.tokens?.accessToken;
check("POST /api/auth/login", login.status === 200 && !!token, `statut ${login.status}`);

if (token) {
  const list = await call("GET", "/api/notifications?page=1&pageSize=20", { token });
  const items = Array.isArray(list.json?.data) ? list.json.data : list.json?.data?.items;
  check("GET /api/notifications (liste)", list.status === 200 && Array.isArray(items), `statut ${list.status}, ${items?.length ?? "?"} élément(s)`);
  const unread = await call("GET", "/api/notifications/unread-count", { token });
  const count = unread.json?.data?.count ?? unread.json?.count;
  check("GET /api/notifications/unread-count", unread.status === 200 && typeof count === "number", `compteur ${count}`);
  const readAll = await call("POST", "/api/notifications/read-all", { token });
  check("POST /api/notifications/read-all", readAll.status === 200, `statut ${readAll.status}`);
  const me = await call("GET", "/api/profiles/me", { token });
  check("GET /api/profiles/me (hors notifications)", me.status === 200, `statut ${me.status}`);
}
console.log(failed === 0 ? "TEST DE FUMÉE : RÉUSSI" : `TEST DE FUMÉE : ${failed} ÉCHEC(S)`);
process.exit(failed === 0 ? 0 : 1);
