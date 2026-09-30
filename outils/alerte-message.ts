// Supabase Edge Function « alerte-message » : un mail à Jakez (et à personne d'autre) quand un membre écrit.
// Secrets à créer dans Supabase > Edge Functions > Secrets : RESEND_API_KEY et ALERTE_MAIL.
Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const cle = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const h = { apikey: cle, Authorization: `Bearer ${cle}`, "Content-Type": "application/json" };
  let id = "";
  try { id = (await req.json())?.record?.id ?? ""; } catch { /* rien */ }
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("ok");
  // on relit le message en base et on le marque « alerté » d'un coup : un seul mail par vrai message, jamais pour les réponses de Jakez
  const r = await fetch(`${url}/rest/v1/messages?id=eq.${id}&alerte=is.false&de_admin=is.false`, {
    method: "PATCH", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify({ alerte: true }),
  });
  const m = (await r.json().catch(() => []))[0];
  if (!m) return new Response("ok");
  let pseudo = "Un membre";
  const p = await fetch(`${url}/rest/v1/profils?id=eq.${m.user_id}&select=pseudo`, { headers: h }).then((x) => x.json()).catch(() => []);
  if (p[0]?.pseudo) pseudo = p[0].pseudo;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Bawss <onboarding@resend.dev>",
      to: [Deno.env.get("ALERTE_MAIL")],
      subject: /^Étape \d+\s*:/.test(m.texte) ? `🔥 ${pseudo} est en cuisine et bloque (${String(m.texte).match(/^Étape \d+/)![0].toLowerCase()})` : `💬 ${pseudo} t'a écrit sur Bawss`,
      text: `${pseudo} :\n\n${String(m.texte).slice(0, 1000)}\n\n${m.recette ? "À propos de : " + m.recette + "\n\n" : ""}Réponds depuis Bawss > Mon compte > Boîte de réception :\nhttps://jakez-droid.github.io/bawss/`,
    }),
  });
  return new Response("ok");
});
