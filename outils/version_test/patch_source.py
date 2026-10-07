#!/usr/bin/env python3
"""Version test de l'app : doses dans le mode cuisine, rangées d'accueil, recherche vide, temps, onglets, menu Moi, couvertures.
python3 patch_source.py SOURCE.html OUT.html"""
import json, os, re, sys
src, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
h = open(src, encoding='utf-8').read()


def R(a, b, n=1):
    global h
    c = h.count(a)
    assert c == n, f'{c} x au lieu de {n} : {a[:90]!r}'
    h = h.replace(a, b)


# ---------- données : temps total estimé (minutes) et repos éventuel ----------
TEMPS = {
    'aubergine-rotie-miel-harissa': 55, 'bagel-poulet-bacon-avocat': 20, 'base-de-curry-japonais': 15, 'bechamel': 10,
    'bouillon-de-volaille': 210, 'celeri-roti': 120, 'chakchouka-verte-ou-rouge': 30, 'chou-farci': 90,
    'chou-fleur-roti': 45, 'croissant-aplati-grille-au-miel': 10, 'croque-au-bleu-et-tomate-confite': 20,
    'cuisson-du-riz': 25, 'curry-japonais': 50, 'donburi-asperge': 20, 'flan-vanille': (105, '6 h au frais'),
    'focaccia': (90, '1 nuit de pousse'), 'grilled-cheese': 10, 'gua-bao-au-porc-braise': 150, 'huile-pimentee-mala': 15,
    'karaage': (40, '30 min de marinade'), 'krapao': 20, 'lasagnes-a-la-bolognaise': 90, 'lasagnes-vegetariennes': 90,
    'nouilles-sautees-pak-choi-poulet': 25, 'papillotes-de-saumon-au-citron-confit': 25, 'parmigiana-d-aubergines': 105,
    'porc-braise-au-soja': 90, 'pot-au-feu': 210, 'potimarron-farci-au-mont-d-or': 75, 'poulet-roti': 90,
    'pudding-de-tapioca-au-lait-de-coco': (45, '2 h au frais'), 'quiche-brocoli-jambon-gorgonzola': 70, 'quiche-lorraine': 60,
    'ragu-a-la-bolognaise': 180, 'ragu-birria': 270, 'raviolis-wonton': 75, 'risotto-aux-asperges': 45,
    'roti-de-porc-puree-sauce-moutarde': 150, 'rouleaux-de-printemps-blt': 35, 'salade-de-fenouil-oignon-rouge-thon-et-capres': 15,
    'salade-de-lentilles-tomates-concombre-feta': 30, 'salade-de-pommes-de-terre-japonaise': 30,
    'salade-de-pommes-de-terre-olives-et-lardons': 30, 'salade-grecque': 15, 'sandwich-focaccia': 15,
    'saucisse-et-lentilles': 55, 'tartare-de-thon': 15, 'tarte-a-la-tomate': 80, 'tarte-aux-champignons': 75,
    'tartiflette': 70, 'tatin-d-aubergine': 70, 'tourte-au-poulet': 105, 'tuna-melt': 15,
    'veloute-de-butternut': 45, 'veloute-de-potimarron': 45,
}
m = re.search(r'const RECIPES = (\[.*?\]);\nconst EXPRESSIONS', h, re.S)
RECS = json.loads(m.group(1).replace('<\\/', '</'))
manque = []
for r in RECS:
    t = TEMPS.get(r['id'])
    if t is None:
        if not r.get('prank'):
            manque.append(r['id'])
        continue
    r['temps'], rep = (t if isinstance(t, tuple) else (t, ''))
    if rep:
        r['repos'] = rep
if manque:
    print('sans temps :', manque)
h = h[:m.start(1)] + json.dumps(RECS, ensure_ascii=False).replace('</', '<\\/') + h[m.end(1):]

# ---------- HTML ----------
R('''    <a class="feature" id="feature" hidden></a>
    <div class="filters">''', '''    <a class="feature" id="feature" hidden></a>
    <div id="rangs" hidden></div>
    <h2 class="toutes-t" id="toutes-t">Toutes les recettes</h2>
    <div class="filters">''')
R('''    <div class="grid" id="grid"></div>
    <p class="tuto-again-p">''', '''    <div class="grid" id="grid"></div>
    <div id="bases" hidden></div>
    <div class="empty" id="empty" hidden></div>
    <p class="tuto-again-p">''')
R('''    <div class="empty" id="empty" hidden>
      <p><b>Rien. Nada.</b><br>Même le frigo de ton Jakez un dimanche soir a plus de choix.</p>
      <button class="btn" id="reset" type="button">Effacer les filtres</button>
    </div>
''', '')
R('''    <p class="cook-text" id="cook-text"></p>''', '''    <p class="cook-text" id="cook-text"></p>
    <div class="cook-ing" id="cook-ing" hidden></div>''')
SVG = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
R('<div class="toast" id="toast" hidden></div>', f'''<nav class="tabs" id="tabs" aria-label="Navigation">
  <button type="button" data-tab="recettes" aria-current="page"><svg {SVG}><path d="M4 11h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M2 11h20M9 7.5c0-1.2 1.2-1.2 1.2-2.5M13.8 7.5c0-1.2 1.2-1.2 1.2-2.5"/></svg><span>Recettes</span></button>
  <button type="button" data-tab="favoris"><svg {SVG}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg><span>Favoris</span></button>
  <button type="button" data-tab="courses"><svg {SVG}><path d="M3 4h2.2l2.1 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.1"/><circle cx="10" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg><span>Courses</span><b class="tab-n" hidden></b></button>
  <button type="button" data-tab="moi"><svg {SVG}><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><span>Moi</span><b class="tab-n" hidden></b></button>
</nav>
<div class="toast" id="toast" hidden></div>''')

# ---------- temps ----------
R('''const TYPE_LABEL = { 'Entrée': 'Entrées',''', '''/* temps total (minutes) : affiché à la place du mot Express / Normal, les points d'effort restent */
const duree = m => m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '') : m + ' min';
const tempsHTML = r => { if (!r.temps) return effortHTML(r.effort); const n = (EFFORT[r.effort] || ['', 0])[1]; return `<span class="effort"><span class="dots">${[1,2,3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>${duree(r.temps)}</span>`; };
const TYPE_LABEL = { 'Entrée': 'Entrées',''')
R('''    `<span class="pill">${effortHTML(r.effort)}</span>`,''', '''    `<span class="pill">${tempsHTML(r)}</span>`,
    ...(r.repos ? [`<span class="pill">+ ${esc(r.repos)}</span>`] : []),''')

# ---------- grille : une carte = une fonction (réutilisée par les rangées) ----------
R('''function renderGrid() {
  const list = RECIPES.filter(matches).sort((a, b) => rang(a) - rang(b));
  const big = !filtrage();
  $('#grid').innerHTML = list.map((r, i) => `
    <a class="card ${r.photo ? 'pic' : 'nopic cov ' + couv(r.type)}" href="#${r.id}">
      <div class="tile" aria-hidden="true">${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<span class="cov-k">${esc(TYPE_COURT[r.type] || r.type)}</span><span class="emo">${r.emoji}</span>`}
        ${favs.has(r.id) ? '<span class="heart">♥</span>' : ''}
      </div>
      <div class="body">
        <h3>${esc(r.title)}</h3>
        <div class="meta">${effortHTML(r.effort)}${r.photo ? `<span>${esc(r.type)}</span>` : ''}</div>
      </div>
    </a>`).join('');''', '''const carteHTML = r => `
    <a class="card ${r.photo ? 'pic' : 'nopic cov ' + couv(r.type)}" href="#${r.id}">
      <div class="tile" aria-hidden="true">${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<span class="cov-k">${esc(TYPE_COURT[r.type] || r.type)}</span><span class="emo">${r.emoji}</span>`}
        ${favs.has(r.id) ? '<span class="heart">♥</span>' : ''}
      </div>
      <div class="body">
        <h3>${esc(r.title)}</h3>
        <div class="meta">${tempsHTML(r)}${r.photo ? `<span>${esc(r.type)}</span>` : ''}</div>
      </div>
    </a>`;
/* accueil : « Tes favoris » et « Ce soir, vite fait » au-dessus de la grille (cachées dès qu'on filtre ou cherche) */
/* « Ce soir, vite fait » : les plats express les plus simples (le moins d'ingrédients et d'étapes), 8 au plus */
const RAPIDE = ['Plat', 'Sandwich & snack'];
const PAS_CE_SOIR = ['croissant-aplati-grille-au-miel'];   /* sucré : c'est un goûter, pas un dîner */
const simplicite = r => r.ingr.reduce((n, g) => n + g.items.length, 0) + r.steps.length;
/* les bases (béchamel, bouillon…) ont leur rangée sous la grille ; focaccia et ragù restent avec les recettes */
const DANS_LA_GRILLE = ['focaccia', 'ragu-a-la-bolognaise'];
const aPart = r => r.type === 'Base' && !DANS_LA_GRILLE.includes(r.id);
function renderRangs() {
  const el = $('#rangs'); if (!el) return;
  if (filtrage()) { el.innerHTML = ''; el.hidden = true; return; }
  const tri = (a, b) => rang(a) - rang(b);
  const fav = RECIPES.filter(r => favs.has(r.id)).sort(tri);
  const vite = RECIPES.filter(r => r.effort === '⚡ Express' && RAPIDE.includes(r.type) && !r.prank && !PAS_CE_SOIR.includes(r.id))
    .sort((a, b) => simplicite(a) - simplicite(b) || tri(a, b)).slice(0, 8);
  const bloc = (t, s, L, plus) => L.length ? `<section class="rang"><div class="rang-h"><h2>${t}</h2>${plus ? `<button type="button" class="rang-plus" data-rang="${plus}">Tout voir</button>` : ''}</div>${s ? `<p class="rang-s">${s}</p>` : ''}<div class="rang-l">${L.map(carteHTML).join('')}</div></section>` : '';
  el.innerHTML = bloc('Tes <span>favoris</span>', '', fav, fav.length > 3 ? 'favs' : '')
    + bloc('Ce soir, <span>vite fait</span>', 'Les plus simples de la maison : peu d’ingrédients, peu d’étapes.', vite, '');
  el.hidden = !el.innerHTML;
}
/* recherche sans résultat : des idées proches, et on demande la recette à Jakez */
function suggestions(q) {
  const tri = s => { const t = ' ' + norm(s).replace(/[^a-z0-9]+/g, ' ') + ' ', o = new Set(); for (let i = 0; i < t.length - 2; i++) o.add(t.slice(i, i + 3)); return o; };
  const Q = tri(q); if (!Q.size) return [];
  const sc = RECIPES.filter(r => !r.prank && r.type !== 'Base').map(r => { const T = tri([r.title, ...r.base, ...r.origine, r.type].join(' ')); let n = 0; Q.forEach(g => { if (T.has(g)) n++; }); return [r, n / Q.size]; });
  const bons = sc.filter(x => x[1] >= .3).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const vitrine = VITRINE.map(id => BY_ID[id]).filter(r => r && !r.prank);
  return [...new Set([...bons, ...vitrine])].slice(0, 3);
}
function renderVide(list) {
  const el = $('#empty');
  if (list.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  if (state.q) {
    const sg = suggestions(state.q);
    el.innerHTML = `<p class="vide-t"><b>Pas encore de « ${esc(state.q)} » chez Bawss.</b>Ton Jakez n’a pas de recette testée pour ça… pour l’instant.</p>`
      + `<div class="vide-bts"><button class="btn primary" type="button" data-demande="${esc(state.q)}">${window.bawss ? '📝 Je veux cette recette' : '📞 Demande-la au bawss'}</button><button class="btn" type="button" data-reset>Effacer la recherche</button></div>`
      + (sg.length ? `<p class="vide-s">En attendant, ça peut le faire :</p><div class="rang-l">${sg.map(carteHTML).join('')}</div>` : '');
  } else if (state.favs && !favs.size && nbFiltres() === 1) {
    el.innerHTML = `<p class="vide-t"><b>Pas encore de favori.</b>Touche le ♥ sur une recette qui te fait de l’œil : elle t’attendra ici.</p><div class="vide-bts"><button class="btn" type="button" data-reset>Voir toutes les recettes</button></div>`;
  } else {
    el.innerHTML = `<p class="vide-t"><b>Rien. Nada.</b>Même le frigo de ton Jakez un dimanche soir a plus de choix.</p><div class="vide-bts"><button class="btn" type="button" data-reset>Effacer les filtres</button></div>`;
  }
}
function renderGrid() {
  const tout = RECIPES.filter(matches).sort((a, b) => rang(a) - rang(b));
  const big = !filtrage(), list = big ? tout.filter(r => !aPart(r)) : tout;
  $('#grid').innerHTML = list.map(carteHTML).join('');
  const bases = big ? tout.filter(aPart) : [], bx = $('#bases');
  bx.hidden = !bases.length;
  bx.innerHTML = bases.length ? `<section class="rang rang-bases"><div class="rang-h"><h2>Les <span>bases</span></h2></div><p class="rang-s">Les briques qui servent dans les autres recettes.</p><div class="rang-l">${bases.map(carteHTML).join('')}</div></section>` : '';
  $('#grid').hidden = !list.length;
  renderRangs(); renderVide(list);
  $('#toutes-t').innerHTML = state.favs && nbFiltres() === 1 && !state.q ? 'Tes <span>favoris</span>' : state.q ? 'Résultats' : 'Toutes les recettes';''')
R('''      <div class="meta">${effortHTML(f.effort)}<span>${esc(f.type)}</span></div>''', '''      <div class="meta">${tempsHTML(f)}<span>${esc(f.type)}</span></div>''')
R('''  $('#empty').hidden = list.length > 0;
''', '')
R('''  $('#count').textContent = list.length === RECIPES.length ? '' : `${list.length} sur ${RECIPES.length} recettes`;
  $('#count').hidden = list.length === RECIPES.length;''', '''  $('#count').textContent = big ? '' : `${tout.length} sur ${RECIPES.length} recettes`;
  $('#count').hidden = big;''')
R("""const ajusterGrille = () => requestAnimationFrame(() => ajusterTitres(document.querySelectorAll('#grid .card h3, #feature h2')));""",
  """const ajusterGrille = () => requestAnimationFrame(() => ajusterTitres(document.querySelectorAll('#grid .card h3, #rangs .card h3, #bases .card h3, #empty .card h3, #feature h2')));""")
R("""$('#reset').addEventListener('click', () => { toutEffacer(); state.q = ''; $('#q').value = ''; renderChips(); renderGrid(); });""",
  """$('#empty').addEventListener('click', e => {
  if (e.target.closest('[data-reset]')) { toutEffacer(); state.q = ''; $('#q').value = ''; renderChips(); renderGrid(); if (window.majOngletsBas) window.majOngletsBas(); return; }
  if (e.target.closest('[data-demande]')) callBoss();   /* sur Bawss, la demande est interceptée et enregistrée */
});
$('#rangs').addEventListener('click', e => {
  const b = e.target.closest('[data-rang]'); if (!b) return;
  toutEffacer(); if (b.dataset.rang === 'favs') state.favs = true; else state.efforts.add('⚡ Express');
  renderChips(); renderGrid(); if (window.majOngletsBas) window.majOngletsBas();
  requestAnimationFrame(() => scrollTo({ top: $('#toutes-t').getBoundingClientRect().top + scrollY - $('.top').offsetHeight - 14, behavior: 'smooth' }));
});""")

# ---------- mode cuisine : les doses de l'étape ----------
R('/* ---------- cook mode ---------- */', open(os.path.join(here, 'doses.js'), encoding='utf-8').read() + '\n/* ---------- cook mode ---------- */')
R('''  const ct = $('#cook-text'); ct.classList.remove('in'); void ct.offsetWidth; ct.classList.add('in');''', '''  const ct = $('#cook-text'); ct.classList.remove('in'); void ct.offsetWidth; ct.classList.add('in');
  const di = dosesEtape(r)[i] || [], L = flatLines(r), f = serves[r.id] / baseServes(r), ci = $('#cook-ing');
  ci.hidden = !di.length;
  ci.innerHTML = di.length ? `<p class="cook-ing-t">Pour cette étape · pour ${servesLabel(r, serves[r.id])}</p><ul>${di.map(k => { const t = scaleText(L[k], f), q = t.match(UNIT); return `<li>${q && q[0].trim() ? `<b>${esc(q[0].trim())}</b>${esc(t.slice(q[0].length))}` : esc(t)}</li>`; }).join('')}</ul>` : '';''')

# ---------- onglets en bas + menu « Moi » ----------
R('/* ---------- signature en bas de la liste ---------- */', r'''/* ---------- onglets en bas : Recettes · Favoris · Courses · Moi ---------- */
function ouvrirMoi() {
  if (document.querySelector('.moi-o')) return;
  const o = document.createElement('div'); o.className = 'moi-o';
  o.innerHTML = `<div class="moi" role="dialog" aria-modal="true" aria-label="Moi"><div class="moi-h"><h2>Moi</h2><button type="button" class="moi-x" data-moi-x aria-label="Fermer">✕</button></div>
    <div class="moi-c" data-moi-compte></div>
    <div class="moi-l">
      <button type="button" data-moi="inviter"><b>👋 Inviter un pote</b><span>Il reçoit un lien avec ton nom dessus</span></button>
      <button type="button" data-moi="tour"><b>🧭 Le tour de l’appli</b><span>Tout ce qu’on peut faire ici, en deux minutes</span></button>
      <button type="button" data-moi="faq"><b>❓ Questions fréquentes</b><span>Courses, mode cuisine, compte…</span></button>
      <button type="button" data-moi="lexique"><b>📖 Lexique breton</b><span>Pour comprendre ton Jakez</span></button>
      <button type="button" data-moi="intro"><b>🎬 Revoir la bande-annonce</b><span>Monte le son</span></button>
    </div></div>`;
  document.body.appendChild(o); document.documentElement.style.overflow = 'hidden';
  requestAnimationFrame(() => o.classList.add('on'));
  dispatchEvent(new CustomEvent('bawss-moi', { detail: o.querySelector('[data-moi-compte]') }));
  o.addEventListener('click', e => {
    if (e.target === o || e.target.closest('[data-moi-x]')) { fermerMoi(); return; }
    const b = e.target.closest('[data-moi]'); if (!b) return;
    const a = b.dataset.moi; fermerMoi();
    ({ inviter: () => window.inviterPote && window.inviterPote(), tour: () => { toutEffacer(); state.q = ''; $('#q').value = ''; renderChips(); renderGrid(); if (window.revoirTuto) window.revoirTuto(); }, faq: () => window.ouvrirFaq && window.ouvrirFaq(), lexique: () => $('#lex-btn').click(), intro: () => $('#fin-bawss').click() })[a]();
  });
  majOngletsBas();
}
function fermerMoi() { const o = document.querySelector('.moi-o'); if (!o) return; o.remove(); document.documentElement.style.overflow = ''; majOngletsBas(); }
function majOngletsBas() {
  const T = $('#tabs'); if (!T) return;
  const c = !$('#cart').hidden ? 'courses' : document.querySelector('.moi-o') ? 'moi'
    : (!location.hash && state.favs && nbFiltres() === 1 && !state.q) ? 'favoris' : 'recettes';
  T.querySelectorAll('[data-tab]').forEach(b => { if (b.dataset.tab === c) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}
window.ouvrirMoi = ouvrirMoi; window.fermerMoi = fermerMoi; window.majOngletsBas = majOngletsBas;
(() => {
  const T = $('#tabs'); if (!T) return;
  document.documentElement.classList.add('a-onglets');
  const viderRecherche = () => { toutEffacer(); state.q = ''; $('#q').value = ''; };
  T.addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    const t = b.dataset.tab;
    fermerMoi();
    if (t !== 'courses' && !$('#cart').hidden) closeCart();
    if (t === 'recettes') { const ici = !location.hash && !filtrage(); viderRecherche(); renderChips(); if (location.hash) backToList(); else renderGrid(); scrollTo({ top: 0, behavior: ici ? 'smooth' : 'auto' }); }
    if (t === 'favoris') { viderRecherche(); state.favs = true; renderChips(); if (location.hash) backToList(); else renderGrid(); setTimeout(() => scrollTo({ top: $('#toutes-t').getBoundingClientRect().top + scrollY - $('.top').offsetHeight - 14 }), 60); }
    if (t === 'courses') { if ($('#cart').hidden) openCart(); else closeCart(); }
    if (t === 'moi') ouvrirMoi();
    setTimeout(majOngletsBas, 320);
  });
  /* la pastille du caddy (nombre d'articles) et son petit saut suivent sur l'onglet Courses */
  const src = $('#cart-n'), onglet = T.querySelector('[data-tab="courses"]'), dst = onglet.querySelector('.tab-n');
  const copie = () => { dst.textContent = src.textContent; dst.hidden = src.hidden; };
  new MutationObserver(copie).observe(src, { childList: true, characterData: true, subtree: true, attributes: true }); copie();
  new MutationObserver(() => { if ($('#cart-btn').classList.contains('bump')) { onglet.classList.remove('bump'); void onglet.offsetWidth; onglet.classList.add('bump'); } }).observe($('#cart-btn'), { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => majOngletsBas()).observe($('#cart'), { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('hashchange', () => setTimeout(majOngletsBas, 50));
  addEventListener('keydown', e => { if (e.key === 'Escape') fermerMoi(); });
  $('#extras').addEventListener('click', () => setTimeout(majOngletsBas, 0));
})();

/* ---------- signature en bas de la liste ---------- */''')

# ---------- tour du proprio : il parle des onglets ----------
R("texte: 'Le ❤️ la range dans tes favoris : tu les retrouves dans les filtres.'", "texte: 'Le ❤️ la range dans tes favoris : tu les retrouves dans l’onglet Favoris, en bas.'")
R('Elle t’attend toujours derrière le caddy, en haut à droite.', 'Elle t’attend toujours dans l’onglet Courses, en bas.')
R("""    { bawss: true, cible: () => $('#me-btn'), titre: 'Ton compte', texte: 'Tes favoris et ta liste de courses te suivent sur tous tes appareils. C’est aussi là que tu retrouves tes messages avec le Bawss.' },
    { cible: () => $('#faq-btn'), titre: 'Une question ?', texte: 'Tout est expliqué dans les Questions fréquentes, en bas de la liste. Et tu peux relancer ce tour quand tu veux, juste à côté.', avant: async () => { if (cook) closeCook(); if (mag) fermerMagasin(); backToList(); await dormir(350); } }""",
  """    { cible: () => $('#tabs [data-tab="moi"]'), titre: 'Et Moi ?', texte: () => (window.bawss ? 'Ton compte (tes favoris et ta liste sur tous tes appareils), tes messages avec ton Jakez, ' : '') + 'les Questions fréquentes, le lexique breton et ce tour, si tu veux le refaire : tout est là.', avant: async () => { if (cook) closeCook(); if (mag) fermerMagasin(); backToList(); await dormir(350); } }""")
R("""    const c = $('#aide-btn'); if (!c || !c.getClientRects().length) return;""", """    const c = $('#tabs [data-tab="moi"]') || $('#aide-btn'); if (!c || !c.getClientRects().length) return;""")
R("""<h3>Bienvenue, mon gars</h3><p>Les recettes sont juste en dessous, sers-toi. Besoin d’un coup de main ? Touche le <b>?</b> quand tu veux : je te fais le tour de l’appli.</p>""",
  """<h3>Bienvenue, mon gars</h3><p>Les recettes sont juste là, sers-toi. Besoin d’un coup de main ? Touche <b>Moi</b>, en bas : je te fais le tour de l’appli quand tu veux.</p>""")
R("""    b.style.top = (r.bottom + m + 14) + 'px';
    b.classList.add('pop');""", """    b.style.top = (r.top > innerHeight / 2 ? Math.max(12, r.top - m - 14 - b.offsetHeight) : r.bottom + m + 14) + 'px';
    b.classList.add('pop');""")

# ---------- FAQ : les onglets ----------
R('Pas d’idée ? Ouvre <b>Filtres</b> : type de plat, temps, ingrédient principal et tes favoris.</p>',
  'Pas d’idée ? Ouvre <b>Filtres</b> : type de plat, temps, ingrédient principal. Tes favoris ont leur onglet, en bas.</p>')
R('une <b>pastille rouge</b> t’attend sur le bouton de ton compte à ta prochaine visite.', 'une <b>pastille rouge</b> t’attend sur l’onglet <b>Moi</b>, en bas, à ta prochaine visite.')
R('en bas d’une recette, ou dans <b>Mon compte</b>. C’est une conversation privée', 'en bas d’une recette, ou dans l’onglet <b>Moi</b>. C’est une conversation privée')
R('Touche <b>« 👋 Inviter un pote »</b> en bas de la liste ou dans Mon compte.', 'Touche <b>« 👋 Inviter un pote »</b> dans l’onglet <b>Moi</b>, en bas.')
R("""      + Q('C’est quoi le mode cuisine ?', '<p>Une étape à la fois, en gros, et l’écran reste allumé.""",
  """      + Q('C’est quoi le mode cuisine ?', '<p>Une étape à la fois, en gros. Quand une étape assemble des ingrédients (une sauce, une marinade, une garniture), leurs doses s’affichent juste en dessous. L’écran reste allumé.""")

# ---------- styles ----------
CSS = r'''
/* ---------- version test : accueil, mode cuisine, onglets, couvertures ---------- */
/* couvertures sans photo : une seule teinte, celle de la marque (le type reste écrit en haut) */
.t-plat, .t-entree, .t-snack, .t-base, .t-dessert, .t-sauce { --cv: #15283A; --cv2: #1A3147; --cvt: #F2F3EF; }
.card.cov .cov-k { background: var(--cire); color: #0E1B26; }
.card.cov .tile .emo { box-shadow: 4px 4px 0 var(--cire); }
/* cartes photo : un dégradé plus franc sous le titre */
.card.pic .tile::after { background: linear-gradient(to top, rgba(8, 16, 24, .94) 0%, rgba(8, 16, 24, .6) 34%, rgba(8, 16, 24, .12) 58%, transparent 70%); }
/* rangées de l'accueil */
#rangs { display: grid; gap: 30px; margin-top: 34px; }
.rang-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.rang h2, .toutes-t { margin: 0; font: 900 clamp(32px, 6vw, 48px)/.95 var(--f-display); text-transform: uppercase; letter-spacing: .005em; }
.rang h2 span, .toutes-t span { background: var(--cire); color: var(--cire-ink); padding: 0 .1em; }
.rang-s { margin: 6px 0 0; color: var(--muted); font-size: 14.5px; }
.rang-plus { flex: none; border: 0; background: none; font: 600 14.5px var(--f-body); color: var(--ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; padding: 4px 0; }
.rang-l { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; margin: 12px -24px 0; padding: 0 24px 8px; scroll-padding-inline: 24px; }
.rang-l::-webkit-scrollbar { display: none; }
.rang-l .card { flex: 0 0 calc((100% - 30px) / 4.4); scroll-snap-align: start; animation: none; }
@media (max-width: 680px) { .rang-l { margin-inline: -16px; padding-inline: 16px; scroll-padding-inline: 16px; } .rang-l .card { flex-basis: calc((100% - 10px) / 2.25); } }
.toutes-t { margin-top: 44px; }
#bases { margin: 6px 0 40px; }
/* recherche sans résultat */
.empty { text-align: left; padding: 22px 0 36px; color: var(--ink); }
.vide-t { margin: 0; font-size: 16.5px; color: var(--muted); max-width: 46ch; }
.vide-t b { display: block; margin-bottom: 8px; font: 900 clamp(30px, 6vw, 44px)/.95 var(--f-display); text-transform: uppercase; color: var(--ink); }
.vide-bts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.vide-s { margin: 26px 0 0; font: 500 12.5px var(--f-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
/* mode cuisine : les ingrédients de l'étape */
.cook-ing { background: color-mix(in srgb, var(--on-slate) 9%, transparent); border-radius: 16px; padding: 14px 18px 16px; }
.cook-ing-t { margin: 0 0 8px; font: 500 12px var(--f-mono); letter-spacing: .12em; text-transform: uppercase; color: color-mix(in srgb, var(--on-slate) 65%, transparent); }
.cook-ing-t strong { font-weight: 500; }
.cook-ing ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 7px; }
.cook-ing li { font-size: clamp(17px, 2.4vw, 22px); line-height: 1.3; }
.cook-ing b { color: var(--cire); font-weight: 700; }
/* onglets */
.a-onglets body { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 74px); }
.a-onglets .top .cart-btn, .a-onglets .tuto-again-p { display: none; }
.a-onglets .top .brand { flex-basis: auto; }
@media (max-width: 680px) { .a-onglets .top .brand, .a-onglets .top .brand:has(+ .me-btn) { flex: 0 0 100%; } }
.a-onglets .toast { bottom: calc(env(safe-area-inset-bottom, 0px) + 86px); }
.tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 45; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: var(--slate); color: var(--on-slate); padding: 6px 6px calc(env(safe-area-inset-bottom, 0px) + 6px); box-shadow: 0 -8px 26px rgba(0, 0, 0, .2); }
.tabs button { position: relative; appearance: none; border: 0; background: none; color: color-mix(in srgb, var(--on-slate) 60%, transparent); display: grid; justify-items: center; gap: 3px; padding: 7px 0 5px; font: 600 11.5px var(--f-body); letter-spacing: .02em; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.tabs svg { width: 25px; height: 25px; }
.tabs button[aria-current] { color: var(--cire); }
.tabs button[aria-current] svg { transform: translateY(-1px); }
.tabs .tab-n { position: absolute; top: 1px; left: calc(50% + 5px); min-width: 19px; height: 19px; box-sizing: border-box; border-radius: 10px; background: var(--red, #E4322B); color: #FFFFFF; font: 700 11px/19px var(--f-body); padding: 0 5px; text-align: center; }
.tabs [data-tab="courses"] .tab-n { background: var(--cire); color: var(--cire-ink); }
.tabs button.bump svg { animation: heart .45s cubic-bezier(.3, 2, .5, 1); }
@media (min-width: 681px) { .tabs { left: 50%; right: auto; transform: translateX(-50%); width: min(520px, calc(100% - 32px)); bottom: 16px; border-radius: 20px; padding-bottom: 6px; } .a-onglets body { padding-bottom: 96px; } }
/* menu Moi : une feuille claire qui monte du bas */
.moi-o { position: fixed; inset: 0; z-index: 85; background: rgba(6, 12, 18, .5); display: flex; align-items: flex-end; justify-content: center; opacity: 0; transition: opacity .2s ease; }
.moi-o.on { opacity: 1; }
.moi { width: min(560px, 100%); max-height: 88vh; overflow-y: auto; box-sizing: border-box; background: var(--paper); color: var(--ink); border-radius: 22px 22px 0 0; padding: 18px 16px calc(env(safe-area-inset-bottom, 0px) + 18px); transform: translateY(40px); transition: transform .28s cubic-bezier(.2, 1.2, .4, 1); }
.moi-o.on .moi { transform: none; }
.moi-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.moi-h h2 { margin: 0; font: 900 44px/1 var(--f-display); text-transform: uppercase; }
.moi-x { border: 0; width: 40px; height: 40px; border-radius: 50%; background: color-mix(in srgb, var(--ink) 8%, transparent); color: var(--ink); font-size: 17px; cursor: pointer; }
.moi-l, .moi-c { display: grid; gap: 8px; }
.moi-c:not(:empty) { margin-bottom: 16px; }
.moi button[data-moi], .moi button[data-mc] { appearance: none; border: 0; text-align: left; border-radius: 14px; background: var(--surface); box-shadow: inset 0 0 0 1px var(--line); color: var(--ink); padding: 13px 16px; display: grid; gap: 2px; cursor: pointer; font: inherit; position: relative; }
.moi button b { font-size: 16.5px; font-weight: 700; }
.moi button span { font-size: 13.5px; color: var(--muted); }
.moi button.moi-cta { background: var(--cire); box-shadow: 4px 4px 0 var(--ink); }
.moi button.moi-cta b { font: 900 26px/1 var(--f-display); text-transform: uppercase; color: var(--cire-ink); }
.moi button.moi-cta span { color: var(--cire-ink); }
.moi button.moi-lien { background: none; box-shadow: none; padding: 6px 4px; justify-self: start; }
.moi button.moi-lien b { font-size: 15px; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.moi .moi-n { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: var(--red, #E4322B); color: #FFFFFF; border-radius: 999px; padding: 2px 8px; font: 700 12px var(--f-body); }
@media (min-width: 681px) { .moi-o { align-items: center; } .moi { border-radius: 22px; } }
'''
R('</style>\n\n<header class="top">', CSS + '</style>\n\n<header class="top">')

open(out, 'w', encoding='utf-8').write(h)
print('ok', len(h))
