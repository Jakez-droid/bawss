/* ---------- Bawss : appli installable, comptes, favoris et liste de courses synchronisés ---------- */
(() => {
  const SB_URL = 'https://ppbyclkztomepipemhdy.supabase.co';
  const SB_KEY = 'sb_publishable_RiL4oWlS4C5Pye5Gz-joBw_zure_NBr';
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const ua = navigator.userAgent;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|Line\/|LinkedInApp|TikTok|musical_ly|GSA\//.test(ua) || (android && /; wv\)/.test(ua));
  const appNom = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV|FB_IAB/.test(ua) ? 'Facebook' : /Snapchat/.test(ua) ? 'Snapchat' : /TikTok|musical_ly/.test(ua) ? 'TikTok' : 'cette appli';
  const plateforme = ios ? 'iPhone' : android ? 'Android' : 'Ordi';
  const esc2 = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ---------- connexion à la base ---------- */
  const H = location.hash;
  /* lien d'invitation : ?de=Léo */
  try {
    const de = new URLSearchParams(location.search).get('de');
    if (de) {
      const nom = de.replace(/[<>"]/g, '').trim().slice(0, 24);
      if (nom && !localStorage.getItem('bawss-invite-par')) localStorage.setItem('bawss-invite-par', nom);
      history.replaceState(null, '', location.pathname + location.hash);
    }
  } catch (e) {}
  const invitePar = () => { try { return localStorage.getItem('bawss-invite-par') || ''; } catch (e) { return ''; } };
  const bandeauInvite2 = () => invitePar() ? '<div class="bw-invite-par">👋 <b>' + String(invitePar()).replace(/[&<>]/g, '') + '</b> t’invite sur Bawss</div>' : '';
  const lienMail = /type=recovery/.test(H) ? 'recovery' : /error_code=|error=access_denied/.test(H) ? 'erreur' : /type=(email_change|signup|magiclink|invite)/.test(H) ? 'mail' : '';
  let sb = null;
  try { if (window.supabase && SB_URL && SB_KEY) sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bawss-session' } }); } catch (e) { sb = null; }
  let moi = null;          // { id, pseudo, admin }
  const pseudoMail = p => {
    const s = p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s ? s + '@bawss.app' : '';
  };
  /* compteur anonyme : un identifiant au hasard par appareil, une ligne par jour dans « visites » */
  const appareil = (() => {
    let a = ls.get('bawss-appareil');
    if (!a) {
      try { a = crypto.randomUUID(); } catch (e) { a = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
      ls.set('bawss-appareil', a);
    }
    return a;
  })();
  const noterVisite = () => { if (sb) sb.rpc('noter_visite', { p_appareil: appareil, p_plateforme: plateforme, p_installee: standalone, p_invite_par: invitePar() || null }).then(() => {}, () => {}); };
  const marque = () => ls.set('bawss-maj', new Date().toISOString());
  const majLocale = () => ls.get('bawss-maj') || '1970-01-01T00:00:00Z';
  const panierVide = c => !c || ((!c.recipes || !Object.keys(c.recipes).length) && !(Array.isArray(c.libres) && c.libres.length));

  /* toute modification des favoris ou de la liste part vers le compte */
  const setOrig = store.set.bind(store);
  let envoi = null, applique = false;
  store.set = (k, v) => {
    setOrig(k, v);
    if (applique || (k !== 'favs' && k !== 'cart')) return;
    marque();
    clearTimeout(envoi); envoi = setTimeout(pousser, 800);
  };
  async function pousser() {
    if (!sb || !moi) return;
    try {
      await sb.from('profils').update({ favs: [...favs], panier: cart, maj_le: majLocale() }).eq('id', moi.id);
    } catch (e) {}
  }
  addEventListener('online', () => { if (moi) pousser(); });

  /* applique ce qui vient du compte à l'appli ouverte */
  function appliquer(f, c) {
    applique = true;
    try {
      favs = new Set((f || []).filter(id => BY_ID[id]));
      saveFavs();
      c = c && c.recipes ? c : { recipes: {}, checked: [] };
      Object.keys(c.recipes).forEach(id => { if (!BY_ID[id]) delete c.recipes[id]; });
      c.checked = Array.isArray(c.checked) ? c.checked : [];
      cart = c; saveCart();
    } finally { applique = false; }
    try { renderCartBadge(); } catch (e) {}
    try { if (!$('#cart').hidden) renderCart(); } catch (e) {}
    try { route(); } catch (e) {}
    document.querySelectorAll('section.recipe [data-fav]').forEach(b => {
      const id = b.closest('section.recipe').id.replace(/^r-/, ''), on = favs.has(id);
      b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
      if (b.classList.contains('heart-btn')) b.innerHTML = on ? ICON.heartFull : ICON.heart;
    });
  }

  /* au démarrage ou à la connexion : on fusionne le téléphone et le compte */
  async function synchroniser(fusion) {
    if (!sb || !moi) return;
    let p;
    try { const r = await sb.from('profils').select('favs,panier,maj_le,admin,pseudo').eq('id', moi.id).maybeSingle(); if (r.error) return; p = r.data; } catch (e) { return; }
    if (!p) {
      const ligne = { id: moi.id, pseudo: moi.pseudo, favs: [...favs], panier: cart, plateforme, installee: standalone };
      const r = await sb.from('profils').insert(invitePar() ? Object.assign({ invite_par: invitePar() }, ligne) : ligne).then(x => x, e => ({ error: e }));
      if (r && r.error && invitePar()) await sb.from('profils').insert(ligne).then(() => {}, () => {});   // colonne pas encore créée
      return;
    }
    moi.admin = !!p.admin; moi.pseudo = p.pseudo || moi.pseudo; majBouton(); chatDemarrer(); if (moi.admin) nouveauxMembres();
    const distant = p.maj_le || '1970-01-01T00:00:00Z';
    let f, c;
    if (fusion) {
      f = [...new Set([...(p.favs || []), ...favs])];
      c = panierVide(cart) ? p.panier : panierVide(p.panier) ? cart : (distant > majLocale() ? p.panier : cart);
    } else if (distant > majLocale()) { f = p.favs; c = p.panier; }
    if (f) { appliquer(f, c); marque(); }
    sb.from('profils').update({ favs: [...favs], panier: cart, maj_le: majLocale(), vu_le: new Date().toISOString(), plateforme, installee: standalone }).eq('id', moi.id).then(() => {}, () => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') synchroniser(false); });

  /* ---------- écrans ---------- */
  const lancer = opts => { if (typeof window.lancerIntro === 'function') window.lancerIntro(opts || {}); };
  const svgPartage = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const svgPlus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  const svgPoints = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  const svgFleche = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15"/><path d="M5 13l7 7 7-7"/></svg>';
  const logo = '<svg class="bw-logo" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#15283A"/><polygon points="50,30 100,12 100,44" fill="#F4B400" opacity="0.35"/><polygon points="50,30 0,14 0,42" fill="#F4B400" opacity="0.35"/><polygon points="40,36 60,36 64,84 36,84" fill="#F2F3EF"/><polygon points="39.2,46 60.8,46 61.5,54 38.5,54" fill="#E4322B"/><polygon points="37.7,64 62.3,64 63,72 37,72" fill="#E4322B"/><rect x="42" y="24" width="16" height="12" fill="#F4B400"/><polygon points="39,24 61,24 50,15" fill="#E4322B"/><rect x="37" y="35" width="26" height="3" fill="#E4322B"/><path d="M0 86 q12.5 -6 25 0 t25 0 t25 0 t25 0 V100 H0 Z" fill="#2B4E6C"/></svg>';

  let ecran = null;
  function ouvrir(html) {
    if (!ecran) {
      ecran = document.createElement('div');
      ecran.className = 'bw'; ecran.setAttribute('role', 'dialog'); ecran.setAttribute('aria-modal', 'true'); ecran.setAttribute('aria-label', 'Bawss');
      document.body.appendChild(ecran);
      document.documentElement.style.overflow = 'hidden';
    }
    ecran.innerHTML = '<div class="bw-in">' + html + '</div>';
    ecran.scrollTop = 0;
    return ecran;
  }
  function fermer() {
    if (!ecran) return;
    ecran.remove(); ecran = null;
    document.documentElement.style.overflow = '';
  }

  /* « installe l'appli » */
  let promptAndroid = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); promptAndroid = e; const b = document.querySelector('.bw [data-installer]'); if (b) b.hidden = false; const s = document.querySelector('.bw [data-android-menu]'); if (s) s.hidden = true; });
  addEventListener('appinstalled', () => {
    if (ecran) ouvrir(logo + '<h1>C\'est <span>installé</span></h1><p>Ferme cette page et ouvre <b>Bawss</b> depuis ton écran d\'accueil, avec l\'icône du phare.</p>');
  });

  function ecranInstall() {
    const intro = bandeauInvite2() + logo + '<h1>Installe <span>Bawss</span></h1>'
      + '<p>Les recettes de ton Jakez direct sur ton téléphone, comme une vraie appli.</p>'
      + '<ul class="bw-pts"><li>Icône sur l\'écran d\'accueil</li><li>Plein écran</li><li>Marche sans réseau</li></ul>';
    let corps = '';
    if (ios && inApp) {
      corps = '<div class="bw-alert">Tu es dans ' + appNom + ' : d\'ici, on ne peut pas installer. Ouvre d\'abord ce lien dans Safari.</div>'
        + '<ol class="bw-steps"><li><span>Touche les <b>trois points</b> <span class="bw-ico">' + svgPoints + '</span> en haut ou en bas de l\'écran.</span></li>'
        + '<li><span>Choisis <b>« Ouvrir dans Safari »</b> ou <b>« Ouvrir dans le navigateur »</b>.</span></li>'
        + '<li><span>Dans Safari, cette page te guide pour la suite.</span></li></ol>';
    } else if (ios) {
      corps = '<ol class="bw-steps">'
        + '<li><span>En bas de l\'écran, touche le bouton <b>Partager</b> <span class="bw-ico">' + svgPartage + '</span><small>Tu ne le vois pas ? Touche d\'abord les trois points <span class="bw-ico">' + svgPoints + '</span> en bas à droite, puis Partager. Si tu es arrivé ici depuis WhatsApp, touche d\'abord l\'icône Safari (la boussole) pour ouvrir la page dans Safari.</small></span></li>'
        + '<li><span>Fais défiler et choisis <b>« Sur l\'écran d\'accueil »</b> <span class="bw-ico">' + svgPlus + '</span><small>Pas dans la liste ? Touche « Voir plus » ou « Modifier les actions ».</small></span></li>'
        + '<li><span>Touche <b>Ajouter</b> en haut à droite. L\'icône du phare arrive sur ton écran d\'accueil.</span></li>'
        + '</ol><div class="bw-arrow" aria-hidden="true">Par ici' + svgFleche + '</div>';
    } else if (android && inApp) {
      corps = '<div class="bw-alert">Tu es dans ' + appNom + ' : d\'ici, on ne peut pas installer. Ouvre d\'abord ce lien dans Chrome.</div>'
        + '<ol class="bw-steps"><li><span>Touche le menu <b>⋮</b> en haut à droite.</span></li><li><span>Choisis <b>« Ouvrir dans Chrome »</b> ou <b>« Ouvrir dans le navigateur »</b>.</span></li><li><span>Dans Chrome, cette page te propose d\'installer l\'appli.</span></li></ol>';
    } else {
      corps = '<button type="button" class="bw-go" data-installer' + (promptAndroid ? '' : ' hidden') + '>Installer Bawss</button>'
        + '<ol class="bw-steps" data-android-menu' + (promptAndroid ? ' hidden' : '') + '><li><span>Touche le menu <b>⋮</b> en haut à droite de Chrome.</span></li><li><span>Choisis <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>.</span></li><li><span>Confirme : l\'icône du phare arrive sur ton écran d\'accueil.</span></li></ol>';
    }
    const rappel = (ios && moi && compteCode() && codeLocal()) ? '<div class="bw-code"><b>Une fois l\'appli ouverte</b><span>Touche 👤 puis « J\'ai déjà un compte » : pseudo <code>' + esc2(moi.pseudo) + '</code>, code <code>' + esc2(codeLocal()) + '</code></span></div>' : '';
    const el = ouvrir(intro + corps + rappel + '<button type="button" class="bw-later" data-plus-tard>Plus tard</button>');
    const b = el.querySelector('[data-installer]');
    if (b) b.addEventListener('click', async () => {
      if (!promptAndroid) return;
      promptAndroid.prompt();
      try { await promptAndroid.userChoice; } catch (e) {}
      promptAndroid = null;
    });
    el.querySelector('[data-plus-tard]').addEventListener('click', () => { ls.set('bawss-plus-tard', String(Date.now())); fermer(); });
  }

  /* « crée ton compte » / « j'ai déjà un compte » */
  const RETOUR = location.origin + location.pathname;
  const mailOk = m => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);
  function traduire(err) {
    const m = String((err && (err.message || err.error_description || err.msg)) || err || '');
    if (/pseudo pris/i.test(m)) return 'Ce pseudo est déjà pris. Ajoute un chiffre, par exemple.';
    if (/already registered|already exists|already been registered|duplicate|unique/i.test(m)) return 'Ce pseudo est déjà pris. Ajoute un chiffre, par exemple. Si c\'est le tien, touche « J\'ai déjà un compte ».';
    if (/invalid login|invalid credentials|invalid grant/i.test(m)) return 'Pseudo ou mot de passe incorrect.';
    if (/password.*(6|characters|short|weak)/i.test(m)) return 'Mot de passe trop court : 6 caractères minimum.';
    if (/same.*password|different from the old/i.test(m)) return 'Choisis un mot de passe différent de l\'ancien.';
    if (/invalid.*email|email.*invalid|valid email/i.test(m)) return 'Ce mail n\'a pas l\'air valide.';
    if (/confirm/i.test(m)) return 'Le compte attend une confirmation par mail : préviens ton Jakez.';
    if (/rate|too many|security purposes/i.test(m)) return 'Trop d\'essais d\'un coup. Attends une minute et réessaie.';
    if (/50[234]|timeout|timed out|gateway|smtp|sending.*email|error sending/i.test(m)) return 'Le service de mails ne répond pas. Réessaie dans une minute.';
    if (/fetch|network|failed|load/i.test(m) || !navigator.onLine) return 'Pas de réseau. Il en faut pour créer ton compte ou te connecter.';
    return 'Ça n\'a pas marché (' + m.slice(0, 80) + '). Réessaie.';
  }
  const champMdp = (id, auto, lab) => '<label for="' + id + '">' + (lab || 'Mot de passe') + '</label><div class="bw-mdp"><input id="' + id + '" type="password" autocomplete="' + auto + '" minlength="6" required><button type="button" class="bw-voir" aria-label="Afficher le mot de passe">Voir</button></div>';
  function brancherVoir(el) {
    el.querySelectorAll('.bw-voir').forEach(b => b.addEventListener('click', e => { const md = e.currentTarget.previousElementSibling, v = md.type === 'password'; md.type = v ? 'text' : 'password'; e.currentTarget.textContent = v ? 'Cacher' : 'Voir'; }));
  }
  const tutoDuCompte = u => { if (u && u.user_metadata && u.user_metadata.tuto) ls.set('bawss-tuto', 'fait'); };
  addEventListener('bawss-tuto-fini', () => { if (sb && moi) sb.auth.updateUser({ data: { tuto: true } }).then(() => {}, () => {}); });
  function connecte(u, pseudo, message) {
    tutoDuCompte(u);
    moi = { id: u.id, pseudo: (u.user_metadata && u.user_metadata.pseudo) || pseudo || ls.get('bawss-pseudo') || 'toi', email: u.email, invite: !!u.is_anonymous, admin: false };
    ls.set('bawss-pseudo', moi.pseudo);
    noterVisite();
    return synchroniser(true).then(() => { majBouton(); fermer(); setTimeout(clinDoeil, 800); if (message) toast(message.replace('%', moi.pseudo)); rzRafraichir(); });
  }
  /* code de connexion : deux mots faciles à retenir, pour retrouver son compte sur un autre appareil */
  const MOTS_CODE = ['crepe', 'bilig', 'kouign', 'galette', 'cidre', 'phare', 'goeland', 'sardine', 'chouchen', 'beurre', 'maquereau', 'bolee', 'chupen', 'biniou', 'homard', 'menhir'];
  const nouveauCode = () => { const r = n => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (e) { return Math.floor(Math.random() * n); } }; return MOTS_CODE[r(MOTS_CODE.length)] + '-' + String(1000 + r(9000)); };
  const codeLocal = () => ls.get('bawss-code') || '';
  const compteCode = () => moi && moi.email && /@bawss\.app$/.test(moi.email);
  function ecranCompte(mode, raison) {
    const creer = mode !== 'connexion';
    const el = ouvrir((creer ? bandeauInvite2() : '') + logo
      + (creer ? '<h1>Choisis ton <span>pseudo</span></h1><p>' + (raison ? esc2(raison) + ' ' : '') + 'Un pseudo et un mot de passe, c\'est tout : pas de mail. Tes favoris et ta liste de courses te suivent sur tous tes appareils.</p>'
               : '<h1>Re-<span>salut</span></h1><p>Ton pseudo et ton mot de passe.</p>')
      + '<form data-compte style="display:grid;gap:12px" novalidate>'
      + (creer ? '<label for="bw-pseudo">Pseudo</label><input id="bw-pseudo" type="text" autocomplete="username" autocapitalize="words" maxlength="24" enterkeyhint="next" required>' + champMdp('bw-mdp', 'new-password', 'Mot de passe <small>(6 caractères minimum)</small>')
               : '<label for="bw-mail">Pseudo</label><input id="bw-mail" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required>'
                 + champMdp('bw-mdp', 'current-password'))
      + '<p class="bw-err" role="alert" hidden></p>'
      + '<button type="submit" class="bw-go">' + (creer ? 'C\'est parti' : 'Me connecter') + '</button></form>'
      + '<button type="button" class="bw-later" data-bascule>' + (creer ? 'J\'ai déjà un compte' : 'Pas de compte ? J\'en crée un') + '</button>'
      + (creer ? '<p class="bw-note">Mot de passe oublié ? Demande à ton Jakez, il te le remet à zéro.</p>'
               : '<p class="bw-note">Ton compte a un code du genre « galette-4821 » ? C\'est lui, ton mot de passe. Inscrit avec ton mail ? Mets ton mail à la place du pseudo.</p>')
      + '<button type="button" class="bw-later bw-sans" data-sans>Plus tard</button>');
    const f = el.querySelector('[data-compte]'), ml = el.querySelector('#bw-mail'), ps = el.querySelector('#bw-pseudo'), md = el.querySelector('#bw-mdp'), go = el.querySelector('.bw-go'), er = el.querySelector('.bw-err');
    if (ml) { const dernier = ls.get('bawss-pseudo') && !/^toi$/.test(ls.get('bawss-pseudo')) ? ls.get('bawss-pseudo') : ls.get('bawss-mail'); if (dernier) ml.value = dernier; }
    brancherVoir(el);
    el.querySelector('[data-bascule]').addEventListener('click', () => ecranCompte(creer ? 'connexion' : 'creer', raison));
    el.querySelector('[data-sans]').addEventListener('click', () => { fermer(); });
    const dire = t => { er.textContent = t; er.hidden = !t; };
    const finir = async (u, pseudo, msg) => { await connecte(u, pseudo, msg); };
    f.addEventListener('submit', async e => {
      e.preventDefault(); dire('');
      go.disabled = true; go.textContent = '…';
      try {
        if (creer) {
          const pseudo = ps.value.trim().replace(/\s+/g, ' ');
          if (pseudo.length < 2 || !pseudoMail(pseudo)) throw new Error('Choisis un pseudo d\'au moins 2 lettres ou chiffres.');
          const mdpN = md.value;
          if (mdpN.length < 6) throw new Error('Choisis un mot de passe d\'au moins 6 caractères.');
          const libre = await sb.rpc('pseudo_libre', { p: pseudo }).then(x => (x.error ? null : x.data), () => null);
          if (libre === false) throw new Error('pseudo pris');
          // 1) compte pseudo + mot de passe (marche sur tous les appareils)
          let r = await sb.auth.signUp({ email: pseudoMail(pseudo), password: mdpN, options: { data: { pseudo } } }).then(x => x, x => ({ error: x }));
          if (!r.error && r.data && r.data.user && Array.isArray(r.data.user.identities) && !r.data.user.identities.length) throw new Error('pseudo pris');
          if (r.error && /already|registered|exists|duplicate/i.test(r.error.message || '')) throw new Error('pseudo pris');
          if (!r.error && r.data && r.data.session) {
            ls.del('bawss-code');
            await finir(r.data.user, pseudo, 'Bienvenue % !');
            return;
          }
          // 2) sinon, compte lié à ce téléphone (quand la base ne permet pas le 1)
          r = await sb.auth.signInAnonymously({ options: { data: { pseudo } } }).then(x => x, x => ({ error: x }));
          if (r.error || !r.data || !r.data.user) throw new Error('compte indispo');
          await finir(r.data.user, pseudo, 'Bienvenue % !');
        } else {
          const id = ml.value.trim(), mdp = md.value.trim();
          if (!id) throw new Error('Mets ton pseudo.');
          if (!mdp) throw new Error('Mets ton mot de passe.');
          const mail = id.includes('@') ? id.toLowerCase() : pseudoMail(id);
          const r = await sb.auth.signInWithPassword({ email: mail, password: mdp });
          if (r.error) throw r.error;
          if (!mail.endsWith('@bawss.app')) ls.set('bawss-mail', mail);
          if (mail.endsWith('@bawss.app') && /^[a-z]+-\d{4}$/.test(mdp)) ls.set('bawss-code', mdp); else ls.del('bawss-code');   // seuls les anciens codes générés s'affichent
          await finir(r.data.user, '', 'Re-salut % !');
        }
      } catch (err) {
        const m = String(err && err.message || err);
        dire(/^compte indispo$/.test(m) ? 'Les comptes ne répondent pas pour l\'instant. Tu peux utiliser Bawss sans compte, et réessayer plus tard.'
          : /^(Choisis|Mets)/.test(m) ? m : traduire(err));
        go.disabled = false; go.textContent = creer ? 'C\'est parti' : 'Me connecter';
      }
    });
    if (!ios) setTimeout(() => (ps || ml).focus(), 300);
  }

  /* « mot de passe oublié » : un lien part par mail */
  function ecranOubli(mailInit) {
    const el = ouvrir(logo + '<h1>Mot de passe <span>oublié</span></h1><p>Mets ton mail : tu reçois un lien pour choisir un nouveau mot de passe.</p>'
      + '<form data-oubli-f style="display:grid;gap:12px" novalidate><label for="bw-mail-o">Mail</label><input id="bw-mail-o" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required>'
      + '<p class="bw-err" role="alert" hidden></p><button type="submit" class="bw-go">Envoyer le lien</button></form>'
      + '<button type="button" class="bw-later" data-retour-co>Retour</button>');
    const ml = el.querySelector('#bw-mail-o'), go = el.querySelector('.bw-go'), er = el.querySelector('.bw-err');
    if (mailInit && mailInit.includes('@')) ml.value = mailInit;
    el.querySelector('[data-retour-co]').addEventListener('click', () => ecranCompte('connexion'));
    el.querySelector('[data-oubli-f]').addEventListener('submit', async e => {
      e.preventDefault();
      const mail = ml.value.trim().toLowerCase();
      if (!mailOk(mail)) { er.textContent = 'Mets ton adresse mail, par exemple leo@gmail.com.'; er.hidden = false; return; }
      go.disabled = true; go.textContent = '…';
      const r = await sb.auth.resetPasswordForEmail(mail, { redirectTo: RETOUR }).then(x => x, x => ({ error: x }));
      if (r.error) { er.textContent = traduire(r.error); er.hidden = false; go.disabled = false; go.textContent = 'Envoyer le lien'; return; }
      ouvrir(logo + '<h1>Regarde tes <span>mails</span></h1><p>Si un compte existe avec <b>' + esc2(mail) + '</b>, un lien vient de partir. Ouvre-le sur ce téléphone pour choisir ton nouveau mot de passe.</p><p class="bw-note">Rien reçu après 5 minutes ? Regarde dans les spams.</p><button type="button" class="bw-go" data-ok>OK</button>');
      ecran.querySelector('[data-ok]').addEventListener('click', () => ecranCompte('connexion'));
    });
  }

  /* arrivée par le lien du mail : on choisit le nouveau mot de passe */
  function ecranNouveauMdp() {
    const el = ouvrir(logo + '<h1>Nouveau <span>mot de passe</span></h1><p>Choisis ton nouveau mot de passe, 6 caractères minimum.</p>'
      + '<form data-nmdp style="display:grid;gap:12px" novalidate>' + champMdp('bw-nmdp', 'new-password')
      + '<p class="bw-err" role="alert" hidden></p><button type="submit" class="bw-go">Enregistrer</button></form>');
    brancherVoir(el);
    const md = el.querySelector('#bw-nmdp'), go = el.querySelector('.bw-go'), er = el.querySelector('.bw-err');
    el.querySelector('[data-nmdp]').addEventListener('submit', async e => {
      e.preventDefault();
      if (md.value.length < 6) { er.textContent = 'Mot de passe trop court : 6 caractères minimum.'; er.hidden = false; return; }
      go.disabled = true; go.textContent = '…';
      const r = await sb.auth.updateUser({ password: md.value }).then(x => x, x => ({ error: x }));
      if (r.error) { er.textContent = traduire(r.error); er.hidden = false; go.disabled = false; go.textContent = 'Enregistrer'; return; }
      await connecte(r.data.user, '', 'Mot de passe changé, re-salut % !');
      lancer();
    });
  }

  /* ---------- bouton « mon compte » dans l'en-tête ---------- */
  const bouton = document.getElementById('me-btn');
  function majBouton() {
    if (!bouton) return;
    const i = bouton.querySelector('.me-i');
    if (moi) { i.textContent = (moi.pseudo || '?').slice(0, 1).toUpperCase(); bouton.classList.add('on'); bouton.setAttribute('aria-label', 'Mon compte : ' + moi.pseudo); }
    else { i.textContent = ''; bouton.classList.remove('on'); bouton.setAttribute('aria-label', 'Me connecter'); }
  }
  function blocCode() {
    if (moi.invite) return '<div class="bw-code"><b>Compte lié à ce téléphone</b><span>Si tu changes de téléphone, crée un nouveau pseudo.</span></div>';
    if (compteCode()) {
      const c = codeLocal();
      return '<div class="bw-code"><b>Pour te connecter sur un autre appareil</b><span>Pseudo : <code>' + esc2(moi.pseudo) + '</code></span>'
        + (c ? '<span>Code : <code>' + esc2(c) + '</code></span>' : '<span>Mot de passe : celui que tu as choisi en créant ton compte.</span>')
        + '<small>Touche « J\'ai déjà un compte » sur l\'autre appareil. Fais une capture d\'écran pour ne pas l\'oublier.</small></div>';
    }
    return '<p class="bw-note">Connecté avec ' + esc2(moi.email || '') + '</p>';
  }
  async function ecranMonCompte() {
    if (!moi) { ecranCompte('creer'); return; }
    const el = ouvrir(logo + '<h1>Salut <span>' + esc2(moi.pseudo) + '</span></h1>'
      + '<button type="button" class="bw-go bw-inv" data-inviter>👋 Inviter un pote</button>'
      + (moi.admin ? '<button type="button" class="bw-choix" data-boite><b>📥 Boîte de réception' + (CHAT.non_lus ? ' · ' + CHAT.non_lus : '') + '</b><span>Les messages de la bande</span></button>'
                   : '<button type="button" class="bw-choix" data-messages><b>💬 Demande à ton Jakez' + (CHAT.non_lus ? ' · ' + CHAT.non_lus + ' nouveau' + (CHAT.non_lus > 1 ? 'x' : '') : '') + '</b><span>Une question, un plat raté, une idée : ton Jakez te répond</span></button>')
      + '<p>Tes favoris et ta liste de courses sont gardés sur ton compte : tu les retrouves en te connectant sur un autre appareil.</p>'
      + blocCode()
      + '<div data-rz-compte></div>'
      + '<div data-membres></div>'
      + '<button type="button" class="bw-go" data-retour>Retour aux recettes</button>'
      + (standalone ? '' : '<button type="button" class="bw-later" data-installer-app>Installer l\'appli sur ce téléphone</button>')
      + '<button type="button" class="bw-later" data-tuto>Revoir le tour du proprio</button>'
      + '<button type="button" class="bw-later" data-faq>Questions fréquentes</button>'
      + '<button type="button" class="bw-later" data-deco>Me déconnecter</button>');
    const bx = el.querySelector('[data-boite]'); if (bx) bx.addEventListener('click', boiteReception);
    const ms = el.querySelector('[data-messages]'); if (ms) ms.addEventListener('click', () => ecranChat());
    el.querySelector('[data-inviter]').addEventListener('click', () => { if (window.inviterPote) window.inviterPote(); });
    el.querySelector('[data-tuto]').addEventListener('click', () => { fermer(); if (window.revoirTuto) window.revoirTuto(); });
    el.querySelector('[data-faq]').addEventListener('click', () => { fermer(); if (window.ouvrirFaq) window.ouvrirFaq(); });
    el.querySelector('[data-retour]').addEventListener('click', fermer);
    const ia = el.querySelector('[data-installer-app]'); if (ia) ia.addEventListener('click', ecranInstall);
    const am = el.querySelector('[data-ajout-mail]');
    if (am) am.addEventListener('submit', async e => {
      e.preventDefault();
      const ml = am.querySelector('input'), er = am.querySelector('.bw-err'), go = am.querySelector('.bw-go'), mail = ml.value.trim().toLowerCase();
      if (!mailOk(mail)) { er.textContent = 'Mets ton adresse mail, par exemple leo@gmail.com.'; er.hidden = false; return; }
      go.disabled = true; go.textContent = '…';
      const r = await sb.auth.updateUser({ email: mail }, { emailRedirectTo: RETOUR }).then(x => x, x => ({ error: x }));
      if (r.error) { er.textContent = traduire(r.error); er.hidden = false; go.disabled = false; go.textContent = 'Ajouter mon mail'; return; }
      ls.set('bawss-mail', mail);
      am.innerHTML = '<div class="bw-alert">C\'est noté. Un lien de confirmation est parti à ' + esc2(mail) + ' : clique dessus pour valider.</div>';
    });
    el.querySelector('[data-deco]').addEventListener('click', async () => {
      try { await sb.auth.signOut(); } catch (e) {}
      if (CHAT.canal) { try { sb.removeChannel(CHAT.canal); } catch (e) {} CHAT.canal = null; } pastille(0);
      moi = null; majBouton(); ls.del('bawss-maj'); rzRafraichir();
      appliquer([], { recipes: {}, checked: [] });
      toast('Déconnecté'); ecranCompte('connexion');
    });
    rzCompte(el.querySelector('[data-rz-compte]'));
    if (moi.admin) membres(el.querySelector('[data-membres]'));
  }
  /* pour Jakez : les nouveaux inscrits depuis sa dernière visite (pastille + bandeau) */
  let NOUVEAUX = [];
  function pastilleMembres(n) {
    if (!bouton) return;
    let d = bouton.querySelector('.mb-dot');
    if (n > 0) { if (!d) { d = document.createElement('span'); d.className = 'mb-dot'; bouton.appendChild(d); } d.textContent = '+' + (n > 9 ? '9' : n); }
    else if (d) d.remove();
  }
  async function nouveauxMembres() {
    if (!sb || !moi || !moi.admin) return;
    const vu = ls.get('bawss-membres-vus');
    if (!vu) { ls.set('bawss-membres-vus', new Date().toISOString()); return; }
    const r = await sb.rpc('membres').then(x => x, () => ({ error: true }));
    if (r.error) return;
    NOUVEAUX = (r.data || []).filter(m => m.cree_le > vu && m.pseudo !== moi.pseudo);
    pastilleMembres(NOUVEAUX.length);
    if (!NOUVEAUX.length) return;
    const noms = NOUVEAUX.slice(0, 3).map(m => esc2(m.pseudo) + (m.invite_par ? ' (invité par ' + esc2(m.invite_par) + ')' : '')).join(', ') + (NOUVEAUX.length > 3 ? '…' : '');
    notif('<b>🎉 ' + NOUVEAUX.length + ' nouveau' + (NOUVEAUX.length > 1 ? 'x membres' : ' membre') + ' depuis ta dernière visite</b><span>' + noms + '</span>', ecranMonCompte, true);
  }
  async function membres(box) {
    box.innerHTML = '<p>Chargement des membres…</p>';
    const vis = sb.rpc('stats_visites').then(x => (x.error ? null : (x.data || [])[0]), () => null);
    let r = await sb.rpc('membres').then(x => x, e => ({ error: e }));
    if (r.error) r = await sb.from('profils').select('pseudo,plateforme,installee,cree_le,vu_le').order('cree_le', { ascending: false }).then(x => x, e => ({ error: e }));
    if (r.error) { box.innerHTML = '<p>Impossible de charger les membres pour l\'instant.</p>'; return; }
    const L = r.data || [], j = d => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const semaine = L.filter(m => Date.now() - new Date(m.vu_le) < 7 * 864e5).length;
    const v = await vis;
    box.innerHTML = (v ? '<p class="bw-note">Visiteurs, avec ou sans compte (un téléphone = un visiteur)</p><div class="bw-stats"><div><b>' + v.appareils + '</b><span>visiteurs</span></div><div><b>' + v.semaine + '</b><span>cette semaine</span></div><div><b>' + v.sans_compte + '</b><span>sans compte</span></div></div>'
      + '<div class="bw-stats"><div><b>' + v.aujourdhui + '</b><span>aujourd\'hui</span></div><div><b>' + v.nouveaux_semaine + '</b><span>nouveaux (7 j)</span></div><div><b>' + v.installes + '</b><span>appli installée</span></div></div><p class="bw-note">Comptes</p>' : '')
      + '<div class="bw-stats"><div><b>' + L.length + '</b><span>membres</span></div><div><b>' + L.filter(m => m.installee).length + '</b><span>appli installée</span></div><div><b>' + semaine + '</b><span>venus cette semaine</span></div></div>'
      + '<ul class="bw-membres">' + L.map(m => '<li' + (NOUVEAUX.some(n => n.pseudo === m.pseudo) ? ' class="neuf"' : '') + '><b>' + (NOUVEAUX.some(n => n.pseudo === m.pseudo) ? '🆕 ' : '') + esc2(m.pseudo) + '</b><span>' + (m.email && !/@bawss\.app$/.test(m.email) ? esc2(m.email) + ' · ' : '') + esc2(m.plateforme || '') + (m.installee ? ' · installée' : '') + (m.invite_par ? ' · invité par ' + esc2(m.invite_par) : '') + ' · inscrit le ' + j(m.cree_le) + ' · vu le ' + j(m.vu_le) + '</span></li>').join('') + '</ul>';
    /* vus : on remet le compteur à zéro */
    ls.set('bawss-membres-vus', new Date().toISOString()); NOUVEAUX = []; pastilleMembres(0);
  }
  if (bouton) bouton.addEventListener('click', ecranMonCompte);

/*@REALISATIONS@*/

  /* ---------- au démarrage ---------- */
  const telephone = ios || android;
  const recent = Date.now() - parseInt(ls.get('bawss-plus-tard') || '0', 10) < 3 * 864e5;
  const nettoyer = () => { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} try { route(); } catch (e) {} };
  /* arrivée par un lien partagé : on montre d'abord la recette, avec une invitation discrète */
  const arrivee = BY_ID[location.hash.slice(1)];
  function bandeauInvite() {
    if (document.querySelector('.bw-invite')) return;
    const b = document.createElement('div');
    b.className = 'bw-invite'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'Découvrir Bawss');
    b.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#15283A"/><polygon points="40,36 60,36 64,84 36,84" fill="#F2F3EF"/><polygon points="39.2,46 60.8,46 61.5,54 38.5,54" fill="#E4322B"/><polygon points="37.7,64 62.3,64 63,72 37,72" fill="#E4322B"/><rect x="42" y="24" width="16" height="12" fill="#F4B400"/><polygon points="39,24 61,24 50,15" fill="#E4322B"/></svg>'
      + '<p><b>Bawss</b><span>Mets-le sur ton écran d\'accueil, comme une vraie appli</span></p>'
      + '<button type="button" class="bw-inv-go">Installer</button>'
      + '<button type="button" class="bw-inv-x" aria-label="Fermer">✕</button>';
    document.body.appendChild(b);
    b.querySelector('.bw-inv-go').addEventListener('click', () => { b.remove(); ecranInstall(); });
    b.querySelector('.bw-inv-x').addEventListener('click', () => { b.remove(); ls.set('bawss-bandeau-non', String(Date.now())); });
  }
  /* nouveau venu : on propose le pseudo juste après l'intro (avant le tour du proprio), puis une 2e fois à la 3e visite */
  let propose = false;
  function proposerCompte(essai) {
    essai = essai || 0;
    if (propose || !sb || moi || lienMail || arrivee) return;
    const n = parseInt(ls.get('bawss-compte-propose') || '0', 10), v = parseInt(ls.get('bawss-visites') || '0', 10);
    if (n >= 2 || (n === 1 && v < 3)) return;
    if (ecran || document.querySelector('.bt, .bt-seance, .bt-studio, .tuto, .pk, .mag, .bw-invite')) { if (essai < 90) setTimeout(() => proposerCompte(essai + 1), 1000); return; }
    propose = true; ls.set('bawss-compte-propose', String(n + 1));
    ecranCompte('creer', n ? '' : 'Bienvenue dans la bande !');
  }
  addEventListener('bawss-intro-fin', () => proposerCompte());

  /* clin d'œil réservé à un membre : une seule fois, juste après l'intro */
  const CLINS = { nus2velours: 'Prends un macdo mon nus2velz' };
  function ecranLabour(phrase) {
    const ex = (typeof EXPRESSIONS !== 'undefined' ? EXPRESSIONS : []).find(e => /labour/i.test(e.br)) || { br: 'Labour arzul labour nul', fr: '« Qui travaille le dimanche, travaille mal »' };
    const el = ouvrir(logo + '<button type="button" class="bw-labour" data-trad aria-expanded="false"><h1><span>' + esc2(ex.br) + '</span></h1><small>Touche pour la traduction</small></button>'
      + '<p class="bw-labour-fr" hidden>' + esc2(ex.fr) + '</p>'
      + '<p class="bw-labour-msg">' + esc2(phrase) + '</p>'
      + '<button type="button" class="bw-go" data-ok>Bien reçu</button>');
    el.querySelector('[data-trad]').addEventListener('click', e => { const fr = el.querySelector('.bw-labour-fr'), b = e.currentTarget; fr.hidden = !fr.hidden; b.setAttribute('aria-expanded', String(!fr.hidden)); b.querySelector('small').textContent = fr.hidden ? 'Touche pour la traduction' : 'Touche pour cacher'; });
    el.querySelector('[data-ok]').addEventListener('click', fermer);
  }
  let clinFait = false;
  function clinDoeil(essai) {
    essai = essai || 0;
    if (clinFait || !moi) return;
    const phrase = CLINS[String(moi.pseudo || '').toLowerCase().trim()];
    if (!phrase || ls.get('bawss-clin-labour')) return;
    if (ecran || document.querySelector('.bt, .bt-seance, .bt-studio, .tuto, .pk, .mag')) { if (essai < 120) setTimeout(() => clinDoeil(essai + 1), 1000); return; }
    clinFait = true; ls.set('bawss-clin-labour', String(Date.now()));
    ecranLabour(phrase);
  }
  addEventListener('bawss-intro-fin', () => setTimeout(clinDoeil, 300));
  function demarrer() {
    if (lienMail === 'recovery') return;          // l'écran « nouveau mot de passe » s'en occupe
    if (lienMail === 'erreur') { nettoyer(); ouvrir(logo + '<h1>Lien <span>expiré</span></h1><p>Ce lien ne marche plus : il a déjà servi ou il est trop vieux. Redemande-en un.</p><button type="button" class="bw-go" data-ok>OK</button>'); ecran.querySelector('[data-ok]').addEventListener('click', () => ecranOubli(ls.get('bawss-mail') || '')); return; }
    if (lienMail === 'mail') { nettoyer(); toast('Ton mail est confirmé'); }
    if (lienMail) return;
    noterVisite();
    if (!arrivee) { lancer(); setTimeout(proposerCompte, 4000); }
    // l'installation est proposée à partir de la 2e visite, sans bloquer
    const jour = new Date().toISOString().slice(0, 10);
    if (ls.get('bawss-jour') !== jour) { ls.set('bawss-jour', jour); ls.set('bawss-visites', String(parseInt(ls.get('bawss-visites') || '0', 10) + 1)); }
    const refus = Date.now() - parseInt(ls.get('bawss-bandeau-non') || '0', 10) < 7 * 864e5;
    if (telephone && !standalone && !recent && !refus && parseInt(ls.get('bawss-visites') || '0', 10) >= 2) { let essais = 0; const tente = () => { if (ecran || document.querySelector('[class^="bt-"],[class*=" bt-"],.tuto,[class^="tt-"]')) { if (++essais < 20) setTimeout(tente, 3000); return; } bandeauInvite(); }; setTimeout(tente, arrivee ? 4000 : 6000); }
  }
  if (!sb) { majBouton(); demarrer(); }
  else {
    sb.auth.onAuthStateChange((ev, s) => {
      if (ev === 'PASSWORD_RECOVERY') { nettoyer(); setTimeout(ecranNouveauMdp, 0); }
      if (ev === 'USER_UPDATED' && s && s.user && moi) { moi.email = s.user.email; }
    });
    let parti = false;
    const go = () => { if (!parti) { parti = true; majBouton(); demarrer(); } };
    setTimeout(go, 2500);  // si la session tarde (réseau), on ne bloque pas l'appli
    sb.auth.getSession().then(({ data }) => {
      const u = data && data.session && data.session.user;
      tutoDuCompte(u);
      if (u) moi = { id: u.id, pseudo: (u.user_metadata && u.user_metadata.pseudo) || ls.get('bawss-pseudo') || 'toi', email: u.email, invite: !!u.is_anonymous, admin: false };
      go();
      if (moi) { synchroniser(false); setTimeout(clinDoeil, 1500); }
      rzRafraichir();
    }, go);
  }
  window.bawssPseudo = () => (moi ? moi.pseudo : '');
  window.bawss = { plateforme, standalone, installer: ecranInstall, compte: ecranMonCompte, apercuClin: () => ecranLabour(CLINS.nus2velours) };
})();
