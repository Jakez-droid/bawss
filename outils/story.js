  /* ---------- cartes pour les stories Insta (image 1080 × 1920 fabriquée sur le téléphone) ---------- */
  const STORY = {
    punch: [
      'Le chat a refusé d’y goûter. Le chat a tort.',
      'Les voisins ont senti. Les voisins ont envié.',
      'Ce plat a été fait par quelqu’un qui mange des pâtes au ketchup.'
    ],
    slogans: ['Cuisine sans filet.', 'Cuisine 2 rue.', 'Du beurre & des larmes.']
  };
  const auHasard = l => l[Math.floor(Math.random() * l.length)];
  const texteBrut = s => String(s || '').replace(/\[\[(.+?)\]\]/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').trim();
  function chargerImage(src) {
    return new Promise((ok, ko) => { const i = new Image(); if (/^https?:/.test(src) && !src.startsWith(location.origin)) i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = ko; i.src = src; });
  }
  function lignes(ctx, texte, largeur) {
    const mots = texte.split(/\s+/), out = []; let l = '';
    mots.forEach(m => { const t = l ? l + ' ' + m : m; if (ctx.measureText(t).width > largeur && l) { out.push(l); l = m; } else l = t; });
    if (l) out.push(l);
    return out;
  }
  function phare(ctx, x, y, h, corps) {           // petit phare, dessin 24 × 32
    const k = h / 32; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const poly = (pts, c) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
    poly([[9, 11], [15, 11], [17, 29], [7, 29]], corps);
    poly([[8.6, 15], [15.4, 15], [15.7, 19], [8.3, 19]], '#E4322B');
    poly([[8, 23], [16, 23], [16.4, 27], [7.6, 27]], '#E4322B');
    ctx.fillStyle = '#F4B400'; ctx.fillRect(9.5, 6, 5, 5);
    poly([[8.5, 6], [15.5, 6], [12, 2]], '#E4322B');
    ctx.restore();
  }
  function logoBawss(ctx, x, y, s) {
    const k = s / 100; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = '#0E1B26'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(0, 0, 100, 100, 22); else ctx.rect(0, 0, 100, 100); ctx.fill();
    ctx.save(); ctx.clip();
    const poly = (pts, c) => { ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
    poly([[50, 30], [100, 12], [100, 44]], 'rgba(244,180,0,.35)'); poly([[50, 30], [0, 14], [0, 42]], 'rgba(244,180,0,.35)');
    poly([[40, 36], [60, 36], [64, 84], [36, 84]], '#F2F3EF');
    poly([[39.2, 46], [60.8, 46], [61.5, 54], [38.5, 54]], '#E4322B'); poly([[37.7, 64], [62.3, 64], [63, 72], [37, 72]], '#E4322B');
    ctx.fillStyle = '#F4B400'; ctx.fillRect(42, 24, 16, 12); poly([[39, 24], [61, 24], [50, 15]], '#E4322B');
    ctx.fillStyle = '#2B4E6C'; ctx.beginPath(); ctx.moveTo(0, 86); for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(i * 25 + 12.5, i % 2 ? 92 : 80, i * 25 + 25, 86); ctx.lineTo(100, 100); ctx.lineTo(0, 100); ctx.closePath(); ctx.fill();
    ctx.restore(); ctx.restore();
  }
  /* o = { image, emoji, legende, note, droite, titre, accroche, sousTitre } */
  async function carteStory(o) {
    const W = 1080, H = 1920, M = 110;
    try { await Promise.all(['900 130px "Big Shoulders Display"', '500 40px "Hanken Grotesk"', 'italic 500 32px "Hanken Grotesk"', '500 34px "DM Mono"'].map(f => document.fonts.load(f))); } catch (e) {}
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#15283A'; ctx.fillRect(0, 0, W, H);
    // polaroïd légèrement penché
    const pw = W - 2 * M, ph = 30 + 760 + 34 + 60, px = M, py = 150;
    ctx.save();
    ctx.translate(px + pw / 2, py + ph / 2); ctx.rotate(-2 * Math.PI / 180); ctx.translate(-pw / 2, -ph / 2);
    ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
    ctx.fillStyle = '#F2F3EF'; ctx.fillRect(0, 0, pw, ph);
    ctx.shadowColor = 'transparent';
    const iw = pw - 60, ih = 760;
    if (o.image) {
      const r = Math.max(iw / o.image.naturalWidth, ih / o.image.naturalHeight), sw = iw / r, sh = ih / r;
      ctx.drawImage(o.image, (o.image.naturalWidth - sw) / 2, (o.image.naturalHeight - sh) / 2, sw, sh, 30, 30, iw, ih);
    } else {
      ctx.fillStyle = '#E4E6E1'; ctx.fillRect(30, 30, iw, ih);
      ctx.font = '360px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.emoji || '🍽️', pw / 2, 30 + ih / 2 + 20);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    ctx.fillStyle = '#0E1B26'; ctx.font = '500 34px "DM Mono", monospace';
    ctx.fillText(o.legende, 34, 30 + ih + 34 + 34);
    if (o.note) for (let i = 0; i < o.note; i++) phare(ctx, pw - 34 - (o.note - i) * 38, 30 + ih + 26, 46, '#0E1B26');
    else if (o.droite) { ctx.textAlign = 'right'; ctx.fillText(o.droite, pw - 34, 30 + ih + 34 + 34); ctx.textAlign = 'left'; }
    ctx.restore();
    // titre : nom du plat en blanc, puis la chute en jaune
    let taille = 130, blanc, jaune;
    for (;;) {
      ctx.font = '900 ' + taille + 'px "Big Shoulders Display", Impact, sans-serif';
      blanc = lignes(ctx, o.titre.toUpperCase(), W - 2 * M); jaune = lignes(ctx, o.sousTitre.toUpperCase(), W - 2 * M);
      if (blanc.length + jaune.length <= 4 || taille <= 90) break;
      taille -= 10;
    }
    let y = py + ph + 110 + taille * 0.8;
    blanc.forEach(l => { ctx.fillStyle = '#F2F3EF'; ctx.fillText(l, M, y); y += taille * 0.9; });
    jaune.forEach(l => { ctx.fillStyle = '#F4B400'; ctx.fillText(l, M, y); y += taille * 0.9; });
    if (o.accroche) {
      ctx.font = '500 42px "Hanken Grotesk", sans-serif'; ctx.fillStyle = 'rgba(242,243,239,.85)';
      y += 20;
      const limite = H - 130 - 84 - 50, ls = lignes(ctx, o.accroche, W - 2 * M), garde = [];
      for (const l of ls) { if (y + garde.length * 57 > limite) break; garde.push(l); }
      if (garde.length < ls.length && garde.length) { let d = garde[garde.length - 1]; while (d && ctx.measureText(d + '…').width > W - 2 * M) d = d.slice(0, -1); garde[garde.length - 1] = d.replace(/[\s,;:]+$/, '') + '…'; }
      garde.forEach(l => { ctx.fillText(l, M, y); y += 57; });
    }
    // pied : logo, « Bawss » et un slogan
    const fy = H - 130 - 84;
    logoBawss(ctx, M, fy, 84);
    ctx.fillStyle = '#F2F3EF'; ctx.font = '900 58px "Big Shoulders Display", Impact, sans-serif'; ctx.fillText('BAWSS', M + 106, fy + 46);
    ctx.font = 'italic 500 32px "Hanken Grotesk", sans-serif'; ctx.fillStyle = 'rgba(242,243,239,.75)'; ctx.fillText(auHasard(STORY.slogans), M + 106, fy + 86);
    return await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
  }
  async function partagerStory(blob, titre) {
    const f = new File([blob], 'bawss-story.jpg', { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: titre }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bawss-story.jpg';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Image enregistrée : ajoute-la à ta story Insta');
  }
  async function storyRecette(id) {
    const r = BY_ID[id]; if (!r) return;
    toast('Je prépare ta carte…');
    let image = null; if (r.photo) { try { image = await chargerImage(r.photo); } catch (e) {} }
    const blob = await carteStory({ image, emoji: r.emoji, legende: 'La recette de Jakez', droite: (EFFORT[r.effort] || [''])[0] ? r.effort : '', titre: r.title + '.', sousTitre: 'À toi de Bawsser.', accroche: '' });
    ecranStory(blob, r.title);
  }
  async function storyRealisation(id, blobPhoto, note) {
    const r = BY_ID[id];
    const url = URL.createObjectURL(blobPhoto);
    let image = null; try { image = await chargerImage(url); } catch (e) {}
    const jour = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
    const moment = new Date().getHours() >= 17 ? ' soir' : new Date().getHours() >= 11 ? ' midi' : ' matin';
    const blob = await carteStory({ image, legende: (moi ? moi.pseudo : '') + ' · ' + jour + moment, note, titre: r.title + '.', sousTitre: 'Comme un Bawss.', accroche: auHasard(STORY.punch) });
    URL.revokeObjectURL(url);
    return blob;
  }
  function ecranStory(blob, titre, intro) {
    const src = URL.createObjectURL(blob);
    const el = ouvrir((intro || '<h1>Ta carte <span>story</span></h1>')
      + '<img class="rz-story" src="' + src + '" alt="Carte story pour ' + esc2(titre) + '">'
      + '<button type="button" class="bw-go" data-story-go>Partager en story</button>'
      + '<button type="button" class="bw-later" data-story-non>Plus tard</button>');
    el.querySelector('[data-story-go]').addEventListener('click', () => partagerStory(blob, titre));
    el.querySelector('[data-story-non]').addEventListener('click', () => { fermer(); URL.revokeObjectURL(src); });
  }
  /* le bouton « Story Insta » sur chaque fiche, à côté de « Partager » */
  function boutonStory(id) {
    const sec = document.getElementById('r-' + id); if (!sec || !BY_ID[id] || BY_ID[id].prank) return;
    if (sec.querySelector('[data-story]')) return;
    const p = sec.querySelector('[data-share]'); if (!p) return;
    p.insertAdjacentHTML('afterend', '<button class="btn" type="button" data-story><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>Story Insta</button>');
    sec.querySelector('[data-story]').addEventListener('click', () => storyRecette(id));
  }
  addEventListener('hashchange', () => boutonStory(location.hash.slice(1)));
  boutonStory(location.hash.slice(1));
