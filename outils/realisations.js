  /* ---------- « Je l'ai faite ! » : photos des potes par recette ---------- */
  const RZ = { bucket: 'realisations', urls: new Map() };
  const PHARE = '<svg class="rz-phare" viewBox="0 0 24 32" aria-hidden="true"><polygon points="9,11 15,11 17,29 7,29" fill="#F2F3EF"/><polygon points="8.6,15 15.4,15 15.7,19 8.3,19" fill="#E4322B"/><polygon points="8,23 16,23 16.4,27 7.6,27" fill="#E4322B"/><rect x="9.5" y="6" width="5" height="5" fill="#F4B400"/><polygon points="8.5,6 15.5,6 12,2" fill="#E4322B"/></svg>';
  const phares = n => (n ? '<span class="rz-phares" aria-label="' + n + ' phare' + (n > 1 ? 's' : '') + '">' + PHARE.repeat(n) + '</span>' : '');
  const quand = d => {
    const s = (Date.now() - new Date(d)) / 1000;
    if (s < 3600) return 'il y a ' + Math.max(1, Math.round(s / 60)) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    if (s < 7 * 86400) return 'il y a ' + Math.round(s / 86400) + ' j';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(16).slice(2));

  /* les photos sont privées : on demande des liens temporaires, gardés le temps de la visite */
  async function signer(paths) {
    const manque = [...new Set(paths)].filter(p => p && !RZ.urls.has(p));
    if (manque.length) {
      const r = await sb.storage.from(RZ.bucket).createSignedUrls(manque, 6 * 3600).then(x => x, e => ({ error: e }));
      (r.data || []).forEach(o => { if (o && o.signedUrl && o.path) RZ.urls.set(o.path, o.signedUrl); });
    }
  }
  async function charger(filtre) {
    if (!sb || !moi) return null;
    const q = filtre(sb.from('realisations').select('id,user_id,pseudo,recette,photo,mot,note,signale,cree_le,likes(user_id)').order('cree_le', { ascending: false }));
    const r = await q.then(x => x, e => ({ error: e }));
    if (r.error) return null;
    const rows = (r.data || []).filter(x => BY_ID[x.recette]);
    await signer(rows.map(x => x.photo));
    rows.forEach(x => {
      x.url = RZ.urls.get(x.photo) || '';
      x.nbLikes = (x.likes || []).length;
      x.jaime = (x.likes || []).some(l => l.user_id === moi.id);
    });
    return rows;
  }
  const vignette = (x, i) => '<button type="button" class="rz-v" data-i="' + i + '" aria-label="Photo de ' + esc2(x.pseudo) + ', ' + esc2(BY_ID[x.recette].title) + '">'
    + '<img src="' + esc2(x.url) + '" alt="" loading="lazy"><span>' + esc2(x.pseudo) + (x.nbLikes ? ' · ❤️ ' + x.nbLikes : '') + '</span></button>';
  const bande = rows => '<div class="rz-strip">' + rows.map(vignette).join('') + '</div>';
  function brancherBande(box, rows, apres) {
    box.querySelectorAll('.rz-v').forEach(v => v.addEventListener('click', () => grande(rows, +v.dataset.i, apres)));
  }

  /* sur chaque fiche : le bouton, le compteur et la galerie */
  function blocRecette(id) {
    const sec = document.getElementById('r-' + id);
    if (!sec || !BY_ID[id] || BY_ID[id].prank) return null;
    let b = sec.querySelector('.rz');
    if (!b) {
      const a = sec.querySelector('.actions'); if (!a) return null;
      a.insertAdjacentHTML('afterend', '<section class="rz" aria-label="Réalisations de la bande"></section>');
      b = sec.querySelector('.rz');
    }
    return b;
  }
  async function afficherRecette(id) {
    const b = blocRecette(id); if (!b) return;
    if (!sb) { b.hidden = true; return; }
    const haut = t => '<div class="rz-top"><span class="rz-n">' + t + '</span></div>';
    /* le bouton vit à droite de « Mode cuisine » */
    const go = () => {
      const act = document.querySelector('#r-' + id + ' .actions'); if (!act) return;
      let g = act.querySelector('[data-rz-go]');
      if (!g) { act.insertAdjacentHTML('beforeend', '<button type="button" class="btn rz-go" data-rz-go>📸 Je l’ai bawssée</button>'); g = act.querySelector('[data-rz-go]'); }
      if (!g.dataset.branche) { g.dataset.branche = '1'; g.addEventListener('click', () => (moi ? choisirPhoto(id) : ecranCompte('connexion'))); }
    };
    if (!moi) { b.innerHTML = haut('Connecte-toi pour voir les photos de la bande'); go(); return; }
    if (!b.innerHTML) { b.innerHTML = haut(''); go(); }
    const rows = await charger(q => q.eq('recette', id).limit(40));
    if (!rows) return;
    const n = rows.length;
    b.innerHTML = haut(n ? 'Faite ' + n + ' fois par la bande' : 'Personne ne l\'a encore postée. Sois le premier !') + (n ? bande(rows) : '');
    go(); brancherBande(b, rows, () => afficherRecette(id));
  }

  /* sur l'accueil : les dernières réalisations de tout le monde */
  function blocAccueil() {
    let s = document.getElementById('rz-home');
    if (!s) {
      const ancre = document.getElementById('feature') || document.querySelector('#list .intro'); if (!ancre) return null;
      ancre.insertAdjacentHTML('afterend', '<section class="rz-home" id="rz-home" hidden aria-label="Ils l’ont fait comme des Bawss"><h2>Ils l’ont fait <span>comme des Bawss</span></h2><div data-rz-home></div></section>');
      s = document.getElementById('rz-home');
    }
    return s;
  }
  async function bandeau() {
    const s = blocAccueil(); if (!s) return;
    if (!moi) { s.hidden = true; return; }
    const rows = await charger(q => q.limit(15));
    if (!rows || !rows.length) { s.hidden = true; return; }
    const box = s.querySelector('[data-rz-home]');
    box.innerHTML = bande(rows); brancherBande(box, rows, bandeau);
    s.hidden = false;
  }

  /* prendre ou choisir la photo, la réduire sur le téléphone */
  function choisirPhoto(id) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try { ecranPublier(id, await reduire(f)); } catch (e) { toast('Impossible de lire cette photo'); }
    });
    inp.click();
  }
  async function reduire(f) {
    const url = URL.createObjectURL(f);
    try {
      const im = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
      const k = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const blob = await new Promise((ok, ko) => c.toBlob(b => (b ? ok(b) : ko(new Error('photo'))), 'image/jpeg', 0.8));
      return { blob, apercu: c.toDataURL('image/jpeg', 0.6) };
    } finally { URL.revokeObjectURL(url); }
  }
  function ecranPublier(id, img) {
    const el = ouvrir('<h1>Bien <span>joué</span></h1><p>' + esc2(BY_ID[id].title) + '</p>'
      + '<img class="rz-apercu" src="' + img.apercu + '" alt="Ta photo">'
      + '<form data-pub style="display:grid;gap:12px" novalidate>'
      + '<label for="rz-mot">Un petit mot (facultatif)</label><input id="rz-mot" type="text" maxlength="140" placeholder="Trop de piment, j\'ai pleuré">'
      + '<label id="rz-note-l">Ta note (facultatif)</label><div class="rz-note" role="group" aria-labelledby="rz-note-l">'
      + [1, 2, 3].map(n => '<button type="button" data-n="' + n + '" aria-pressed="false" aria-label="' + n + ' phare' + (n > 1 ? 's' : '') + '">' + phares(n) + '</button>').join('') + '</div>'
      + '<p class="bw-err" role="alert" hidden></p><button type="submit" class="bw-go">Publier</button></form>'
      + '<button type="button" class="bw-later" data-annuler>Annuler</button>');
    let note = null;
    el.querySelectorAll('.rz-note button').forEach(b => b.addEventListener('click', () => {
      note = note === +b.dataset.n ? null : +b.dataset.n;
      el.querySelectorAll('.rz-note button').forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.n === note)));
    }));
    el.querySelector('[data-annuler]').addEventListener('click', fermer);
    const go = el.querySelector('.bw-go'), er = el.querySelector('.bw-err');
    const rate = t => { er.textContent = t; er.hidden = false; go.disabled = false; go.textContent = 'Publier'; };
    el.querySelector('[data-pub]').addEventListener('submit', async e => {
      e.preventDefault();
      if (!navigator.onLine) return rate('Pas de réseau : réessaie quand tu en as.');
      go.disabled = true; go.textContent = 'Envoi…'; er.hidden = true;
      const chemin = moi.id + '/' + nouvelId() + '.jpg';
      const up = await sb.storage.from(RZ.bucket).upload(chemin, img.blob, { contentType: 'image/jpeg', upsert: false }).then(x => x, x => ({ error: x }));
      if (up.error) return rate('La photo n\'est pas passée. Réessaie.');
      const mot = el.querySelector('#rz-mot').value.trim().slice(0, 140);
      const ins = await sb.from('realisations').insert({ recette: id, photo: chemin, mot: mot || null, note }).then(x => x, x => ({ error: x }));
      if (ins.error) { sb.storage.from(RZ.bucket).remove([chemin]).then(() => {}, () => {}); return rate('Ça n\'a pas marché. Réessaie.'); }
      afficherRecette(id); bandeau();
      go.textContent = 'Je prépare ta carte…';
      let carte = null; try { carte = await storyRealisation(id, img.blob, note); } catch (e) {}
      if (carte) ecranStory(carte, BY_ID[id].title, '<h1>C\'est en <span>ligne</span></h1><p>Bien joué ' + esc2(moi.pseudo) + ' ! Tu la balances en story ?</p>');
      else { fermer(); toast('Bien joué ' + moi.pseudo + ' ! Ta photo est en ligne'); }
    });
  }

  /* la photo en grand : likes, suivante, supprimer ou signaler */
  function grande(rows, i, apres) {
    const x = rows[i]; if (!x) return;
    const peutSuppr = moi && (x.user_id === moi.id || moi.admin);
    let change = false;
    const el = ouvrir('<figure class="rz-grande"><img src="' + esc2(x.url) + '" alt="Photo de ' + esc2(x.pseudo) + '">'
      + '<figcaption><b>' + esc2(x.pseudo) + '</b> · ' + esc2(BY_ID[x.recette].title) + ' · ' + quand(x.cree_le) + (x.note ? ' · ' + phares(x.note) : '')
      + (x.mot ? '<q>' + esc2(x.mot) + '</q>' : '') + '</figcaption></figure>'
      + '<div class="rz-actions"><button type="button" class="rz-like" aria-pressed="' + x.jaime + '" aria-label="J\'aime">' + (x.jaime ? '❤️' : '🤍') + ' <span>' + x.nbLikes + '</span></button>'
      + (rows.length > 1 ? '<button type="button" data-prec aria-label="Photo précédente">‹</button><button type="button" data-suiv aria-label="Photo suivante">›</button>' : '') + '</div>'
      + '<button type="button" class="bw-go" data-retour>Retour</button>'
      + (location.hash.slice(1) !== x.recette ? '<button type="button" class="bw-later" data-voir>Voir la recette</button>' : '')
      + (peutSuppr ? '<button type="button" class="bw-later" data-suppr>Supprimer cette photo</button>'
                   : '<button type="button" class="bw-later" data-signal>Signaler cette photo</button>'));
    const fin = () => { fermer(); if (change && apres) apres(); };
    el.querySelector('[data-retour]').addEventListener('click', fin);
    const vo = el.querySelector('[data-voir]'); if (vo) vo.addEventListener('click', () => { fermer(); location.hash = x.recette; });
    const nav = d => grande(rows, (i + d + rows.length) % rows.length, apres);
    const pr = el.querySelector('[data-prec]'); if (pr) pr.addEventListener('click', () => nav(-1));
    const su = el.querySelector('[data-suiv]'); if (su) su.addEventListener('click', () => nav(1));
    const lk = el.querySelector('.rz-like');
    lk.addEventListener('click', async () => {
      const avant = x.jaime;
      x.jaime = !avant; x.nbLikes += x.jaime ? 1 : -1; change = true;
      lk.setAttribute('aria-pressed', String(x.jaime)); lk.innerHTML = (x.jaime ? '❤️' : '🤍') + ' <span>' + x.nbLikes + '</span>';
      const r = avant
        ? await sb.from('likes').delete().eq('realisation', x.id).eq('user_id', moi.id).then(y => y, y => ({ error: y }))
        : await sb.from('likes').insert({ realisation: x.id }).then(y => y, y => ({ error: y }));
      if (r.error) { x.jaime = avant; x.nbLikes += avant ? 1 : -1; lk.setAttribute('aria-pressed', String(avant)); lk.innerHTML = (avant ? '❤️' : '🤍') + ' <span>' + x.nbLikes + '</span>'; toast('Pas de réseau, réessaie'); }
    });
    const sp = el.querySelector('[data-suppr]');
    if (sp) {
      let sur = false;
      sp.addEventListener('click', async () => {
        if (!sur) { sur = true; sp.textContent = 'Sûr ? Touche encore pour supprimer'; return; }
        const r = await sb.from('realisations').delete().eq('id', x.id).then(y => y, y => ({ error: y }));
        if (r.error) { toast('Pas réussi à supprimer, réessaie'); return; }
        sb.storage.from(RZ.bucket).remove([x.photo]).then(() => {}, () => {});
        toast('Photo supprimée'); change = true; fin();
      });
    }
    const sg = el.querySelector('[data-signal]');
    if (sg) sg.addEventListener('click', async () => {
      await sb.rpc('signaler', { r: x.id }).then(() => {}, () => {});
      sg.disabled = true; sg.textContent = 'Signalée, Jakez va regarder';
    });
  }

  /* dans « mon compte » : mes réalisations, et pour l'admin les photos signalées */
  async function rzCompte(box) {
    if (!box || !sb || !moi) return;
    const rows = await charger(q => q.eq('user_id', moi.id).limit(60));
    let html = '';
    if (rows && rows.length) {
      const n = new Set(rows.map(x => x.recette)).size;
      html += '<div class="rz-compte"><h2>Tu as testé ' + n + ' recette' + (n > 1 ? 's' : '') + '</h2>' + bande(rows) + '</div>';
    }
    let sig = null;
    if (moi.admin) {
      sig = await charger(q => q.eq('signale', true).limit(40));
      if (sig && sig.length) html += '<div class="rz-compte" data-sig><h2>' + sig.length + ' photo' + (sig.length > 1 ? 's' : '') + ' signalée' + (sig.length > 1 ? 's' : '') + '</h2>' + bande(sig) + '</div>';
    }
    box.innerHTML = html;
    const [a, b] = box.querySelectorAll('.rz-compte');
    if (rows && rows.length && a) brancherBande(a, rows, ecranMonCompte);
    const s = box.querySelector('[data-sig]'); if (s && sig) brancherBande(s, sig, ecranMonCompte);
  }

  function rzRafraichir() {
    bandeau();
    const id = location.hash.slice(1);
    if (BY_ID[id]) afficherRecette(id);
  }
  addEventListener('hashchange', () => { const id = location.hash.slice(1); if (BY_ID[id]) afficherRecette(id); });
