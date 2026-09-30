  /* ---------- « Écris au Bawss » : conversation privée entre chaque membre et Jakez ---------- */
  const CHAT = { non_lus: 0, canal: null, fil: null, cible: null, recette: null };
  const heure = d => { const t = new Date(d), auj = new Date().toDateString() === t.toDateString(); return auj ? t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : t.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + t.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
  function pastille(n) {
    CHAT.non_lus = n;
    if (!bouton) return;
    let p = bouton.querySelector('.chat-dot');
    if (n > 0) { if (!p) { p = document.createElement('span'); p.className = 'chat-dot'; bouton.appendChild(p); } p.textContent = n > 9 ? '9+' : n; }
    else if (p) p.remove();
  }
  const enCuisine = () => { const c = document.getElementById('cook'); return !!(c && !c.hidden); };
  const ETAPE_RE = /^Étape (\d+)\s*:/;
  function notif(html, action, garder) {
    const old = document.querySelector('.chat-notif'); if (old) old.remove();
    const n = document.createElement('button'); n.type = 'button'; n.className = 'chat-notif';
    n.innerHTML = html + '<span class="x" aria-label="Fermer">✕</span>';
    n.addEventListener('click', e => { n.remove(); if (!e.target.closest('.x')) action(); });
    document.body.appendChild(n);
    try { navigator.vibrate && navigator.vibrate([90, 60, 90]); } catch (e) {}
    if (!garder) setTimeout(() => n.remove(), 9000);
  }
  async function alerter(m) {
    const court = esc2(String(m.texte || '').slice(0, 90));
    if (!moi.admin) { notif('<b>💬 Le Bawss t’a répondu</b><span>' + court + '</span>', () => ecranChat(null, null, null), enCuisine()); return; }
    const p = await sb.from('profils').select('pseudo').eq('id', m.user_id).maybeSingle().then(x => x, () => ({}));
    const nom = esc2((p && p.data && p.data.pseudo) || 'Un membre'), cuisine = ETAPE_RE.test(m.texte || '');
    notif('<b>' + (cuisine ? '🔥 ' + nom + ' est en cuisine' : '💬 ' + nom + ' t’a écrit') + '</b><span>' + court + '</span>', () => ecranChat(m.user_id, (p && p.data && p.data.pseudo) || 'Membre'), cuisine);
  }
  async function compterNonLus() {
    if (!sb || !moi) { pastille(0); return; }
    let q = sb.from('messages').select('id', { count: 'exact', head: true }).eq('lu', false);
    q = moi.admin ? q.eq('de_admin', false) : q.eq('user_id', moi.id).eq('de_admin', true);
    const r = await q.then(x => x, e => ({ error: e }));
    if (!r.error) pastille(r.count || 0);
  }
  function ecouter() {
    if (!sb || !moi || CHAT.canal) return;
    const opts = { event: 'INSERT', schema: 'public', table: 'messages' };
    if (!moi.admin) opts.filter = 'user_id=eq.' + moi.id;
    CHAT.canal = sb.channel('bawss-messages').on('postgres_changes', opts, p => {
      const m = p.new; if (!m) return;
      const pourMoi = moi.admin ? !m.de_admin : m.de_admin;
      if (CHAT.fil && ecran && (moi.admin ? m.user_id === CHAT.cible : true)) { ajouterBulle(m); if (pourMoi) marquerLus(); }
      else if (pourMoi) { compterNonLus(); alerter(m); }
    }).subscribe();
  }
  async function marquerLus() {
    if (!sb || !moi) return;
    let q = sb.from('messages').update({ lu: true }).eq('lu', false);
    q = moi.admin ? q.eq('user_id', CHAT.cible).eq('de_admin', false) : q.eq('user_id', moi.id).eq('de_admin', true);
    await q.then(() => {}, () => {});
    compterNonLus();
  }
  function bulle(m) {
    const mien = moi.admin ? m.de_admin : !m.de_admin;
    const r = m.recette && BY_ID[m.recette];
    return '<li class="msg ' + (mien ? 'moi' : 'lui') + '">' + (r ? '<a class="msg-rec" href="#' + esc2(m.recette) + '">À propos de : ' + esc2(r.title) + '</a>' : '')
      + '<p>' + esc2(m.texte).replace(/\n/g, '<br>') + '</p><time>' + heure(m.cree_le) + '</time></li>';
  }
  function ajouterBulle(m) {
    if (!CHAT.fil || CHAT.fil.querySelector('[data-id="' + m.id + '"]')) return;
    const vide = CHAT.fil.querySelector('.msg-vide'); if (vide) vide.remove();
    CHAT.fil.insertAdjacentHTML('beforeend', bulle(m).replace('<li ', '<li data-id="' + m.id + '" '));
    CHAT.fil.scrollTop = CHAT.fil.scrollHeight;
  }
  /* la conversation : pour un membre, avec le Bawss ; pour Jakez, avec le membre choisi */
  async function ecranChat(cible, pseudoCible, recette, etape) {
    if (!sb) return;
    if (!moi) { ecranCompte('connexion'); return; }
    CHAT.cible = moi.admin ? cible : moi.id; CHAT.recette = recette || null;
    const titre = moi.admin ? esc2(pseudoCible || 'Membre') : 'Le <span>Bawss</span>';
    const volet = !moi.admin && enCuisine();
    const ct = document.getElementById('cook-text'), cn = document.getElementById('cook-n');
    const rappel = volet && ct ? '<p class="chat-etape"><b>' + esc2(cn ? cn.textContent : '') + '</b>' + esc2(ct.textContent.slice(0, 160)) + (ct.textContent.length > 160 ? '…' : '') + '</p>' : '';
    const el = ouvrir('<div class="chat-tete"><button type="button" class="chat-retour" data-chat-retour aria-label="' + (volet ? 'Retour aux fourneaux' : 'Retour') + '">' + (volet ? '⌄' : '‹') + '</button><h1>' + titre + '</h1>' + (volet ? '<span class="chat-live">en direct</span>' : '') + '</div>' + rappel
      + (moi.admin || volet ? '' : '<p class="chat-intro">Une question sur une recette, un plat qui tourne mal, une idée ? Écris ici : Jakez te répond dès qu’il peut.</p>')
      + '<ul class="chat-fil" aria-live="polite"><li class="msg-vide">Chargement…</li></ul>'
      + (CHAT.recette && BY_ID[CHAT.recette] ? '<p class="chat-ctx">À propos de : <b>' + esc2(BY_ID[CHAT.recette].title) + '</b> <button type="button" data-chat-sans aria-label="Ne pas joindre la recette">✕</button></p>' : '')
      + '<form class="chat-saisie" data-chat-form><textarea rows="1" maxlength="2000" placeholder="Ton message…" aria-label="Ton message"></textarea><button type="submit" aria-label="Envoyer">➤</button></form>');
    el.classList.add('bw-chat'); el.classList.toggle('bw-sheet', volet);
    CHAT.fil = el.querySelector('.chat-fil');
    el.querySelector('[data-chat-retour]').addEventListener('click', () => { CHAT.fil = null; if (moi.admin) boiteReception(); else fermer(); });
    const sans = el.querySelector('[data-chat-sans]'); if (sans) sans.addEventListener('click', () => { CHAT.recette = null; sans.parentElement.remove(); });
    const ta = el.querySelector('textarea'), form = el.querySelector('[data-chat-form]');
    if (etape) { ta.value = 'Étape ' + etape + ' : '; setTimeout(() => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; }, 0); }
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && matchMedia('(pointer: fine)').matches) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const t = ta.value.trim(); if (!t) return;
      const btn = form.querySelector('button'); btn.disabled = true;
      const row = { texte: t, recette: CHAT.recette, user_id: CHAT.cible };
      const r = await sb.from('messages').insert(row).select().single().then(x => x, x => ({ error: x }));
      btn.disabled = false;
      const errEl = el.querySelector('.chat-err'); if (errEl) errEl.remove();
      if (r.error) {
        const e2 = r.error || {}, code = e2.code || '', msg = String(e2.message || e2);
        const pasPret = code === '42P01' || code === 'PGRST205' || code === '42501' || /does not exist|schema cache|permission denied/i.test(msg);
        form.insertAdjacentHTML('beforebegin', '<p class="chat-err" role="alert">' + (pasPret
          ? 'Le chat n’est pas encore ouvert côté serveur. Réessaie un peu plus tard.'
          : (navigator.onLine === false ? 'Pas de réseau : ton message n’est pas parti.' : 'Ton message n’est pas parti, réessaie.'))
          + (moi.admin ? '<small>' + esc2(code + ' ' + msg) + '</small>' : '') + '</p>');
        return;
      }
      ta.value = ''; ta.style.height = 'auto';
      if (CHAT.recette) { CHAT.recette = null; const c = el.querySelector('.chat-ctx'); if (c) c.remove(); }
      ajouterBulle(r.data);
    });
    const r = await sb.from('messages').select('*').eq('user_id', CHAT.cible).order('cree_le', { ascending: true }).limit(300).then(x => x, e => ({ error: e }));
    if (!CHAT.fil) return;
    const L = (r && r.data) || [];
    CHAT.fil.innerHTML = L.length ? L.map(m => bulle(m).replace('<li ', '<li data-id="' + m.id + '" ')).join('') : '<li class="msg-vide">' + (moi.admin ? 'Pas encore de message.' : 'Pas encore de message. Lance-toi !') + '</li>';
    CHAT.fil.scrollTop = CHAT.fil.scrollHeight;
    CHAT.fil.addEventListener('click', e => { if (e.target.closest('.msg-rec')) { if (volet) { e.preventDefault(); return; } CHAT.fil = null; fermer(); } });
    marquerLus();
    if (!ios) setTimeout(() => ta.focus(), 200);
  }
  /* la boîte de réception de Jakez */
  async function boiteReception() {
    const el = ouvrir('<div class="chat-tete"><button type="button" class="chat-retour" data-chat-retour aria-label="Retour">‹</button><h1>Boîte de <span>réception</span></h1></div><ul class="chat-boite"><li class="msg-vide">Chargement…</li></ul>');
    el.querySelector('[data-chat-retour]').addEventListener('click', ecranMonCompte);
    const r = await sb.from('messages').select('user_id,texte,de_admin,lu,cree_le,recette').order('cree_le', { ascending: false }).limit(500).then(x => x, e => ({ error: e }));
    const box = el.querySelector('.chat-boite'); if (!box) return;
    const fils = new Map();
    ((r && r.data) || []).forEach(m => {
      if (!fils.has(m.user_id)) fils.set(m.user_id, { dernier: m, non_lus: 0 });
      if (!m.de_admin && !m.lu) fils.get(m.user_id).non_lus++;
    });
    if (!fils.size) { box.innerHTML = '<li class="msg-vide">Aucun message pour l’instant.</li>'; return; }
    const ps = await sb.from('profils').select('id,pseudo').in('id', [...fils.keys()]).then(x => x, () => ({ data: [] }));
    const nom = {}; ((ps && ps.data) || []).forEach(p => { nom[p.id] = p.pseudo; });
    box.innerHTML = [...fils.entries()].map(([id, f]) => '<li><button type="button" data-fil="' + id + '" data-nom="' + esc2(nom[id] || 'Membre') + '">'
      + '<b>' + esc2(nom[id] || 'Membre') + (!f.dernier.de_admin && ETAPE_RE.test(f.dernier.texte) && Date.now() - new Date(f.dernier.cree_le) < 3 * 3600e3 ? ' <span class="chat-feu">🔥 en cuisine</span>' : '') + (f.non_lus ? ' <span class="chat-n">' + f.non_lus + '</span>' : '') + '</b>'
      + '<span>' + (f.dernier.de_admin ? 'Toi : ' : '') + esc2(f.dernier.texte.slice(0, 80)) + '</span><time>' + heure(f.dernier.cree_le) + '</time></button></li>').join('');
    box.querySelectorAll('[data-fil]').forEach(b => b.addEventListener('click', () => ecranChat(b.dataset.fil, b.dataset.nom)));
  }
  /* sur chaque fiche, « Appelle le bawss » devient « Écris au Bawss » */
  function boutonsBoss() {
    document.querySelectorAll('.boss').forEach(b => {
      const bt = b.querySelector('[data-boss]'); if (!bt || bt.dataset.chat) return;
      bt.dataset.chat = '1'; bt.textContent = '💬 Écris au Bawss';
      const p = b.querySelector('p'); if (p) p.innerHTML = 'Un problème ?<span>Un doute sur une étape, un plat qui tourne mal… écris-moi, je te réponds.</span>';
    });
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-boss]'); if (!b || !sb) return;
    e.preventDefault(); e.stopPropagation();
    if (moi && moi.admin) { boiteReception(); return; }
    const sec = b.closest('section.recipe');
    ecranChat(null, null, b.dataset.rec || (sec ? sec.id.replace(/^r-/, '') : null), b.dataset.etape);
  }, true);
  boutonsBoss();
  addEventListener('keydown', e => {
    if (!ecran || !enCuisine() || !['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.stopPropagation();
    if (e.key === 'Escape' && CHAT.fil) { CHAT.fil = null; fermer(); }
  }, true);
  function chatDemarrer() { compterNonLus(); ecouter(); }
