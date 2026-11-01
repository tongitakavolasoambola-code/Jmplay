// Supabase Edge Function "send-push" — mandefa fanairana FCM amin'ny topic "all"
// Napetraka ho: Supabase → Edge Functions → Create → "send-push" (JWT verification: OFF)
// Secrets: FCM_SERVICE_ACCOUNT (ny JSON Firebase iray manontolo), PUSH_SECRET (teny miafina anao)
// Database Webhook (table notifications, INSERT + UPDATE) → HTTP header  x-webhook-secret: <PUSH_SECRET>

const b64 = (b: ArrayBuffer | string) => {
  const s = typeof b === "string" ? new TextEncoder().encode(b) : new Uint8Array(b);
  let x = ""; s.forEach((c) => (x += String.fromCharCode(c)));
  return btoa(x).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function accessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + claim));
  const jwt = head + "." + claim + "." + b64(sig);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("token: " + JSON.stringify(j));
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("PUSH_SECRET")) return new Response("forbidden", { status: 403 });
  try {
    const ev = await req.json();
    const rec = ev.record || {}, old = ev.old_record || null;
    // Mandefa ihany rehefa vao navoaka (published + active), tsy isaky ny fanovana
    const live = rec.published === true && rec.active !== false;
    const wasLive = old && old.published === true && old.active !== false;
    if (!live || wasLive) return new Response("skip");
    const sa = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT")!);
    const token = await accessToken(sa);
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ message: {
        topic: "all",
        notification: { title: rec.title || "Hafatra vaovao", body: String(rec.body || "").slice(0, 300) },
        android: { priority: "HIGH", notification: { channel_id: "default" } },
      } }),
    });
    return new Response(await r.text(), { status: r.ok ? 200 : 500 });
  } catch (e) { return new Response(String(e), { status: 500 }); }
});
