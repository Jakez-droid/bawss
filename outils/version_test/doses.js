/* ---------- mode cuisine : les ingrédients (et leurs doses) de chaque étape ---------- */
const DOSE_VIDE = new Set(['de','du','des','la','le','les','d','l','a','au','aux','en','et','ou','huile','sauce','poudre','frais','fraiche','fraiches','gros','grosse','grosses','petit','petite','petits','vert','verte','verts','rouge','rouges','blanc','blanche','jaune','noir','noire','sec','seche','pate','eau','jus','zeste','graine','feuille','fin','fine','neutre','entier','entiere','moulu','moulue','bouquet','brin','gousse','tranche','morceau','pincee','plat','japonaise','kewpie','maison','surgele','surgelee','nature','type']);
const motsDose = s => norm(String(s).replace(/œ/g, 'oe').replace(/Œ/g, 'oe')).replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(w => w.length > 3 ? w.replace(/(s|x)$/, '') : w);
const DOSES = {};
function dosesDe(r) {
  if (DOSES[r.id]) return DOSES[r.id];
  const lignes = flatLines(r), PETITS = w => w !== 'de' && w !== 'du' && w !== 'des' && w !== 'd' && w !== 'l';
  const art = (a, ix) => ({ a, ix, ph: motsDose(a).filter(PETITS), tk: motsDose(a).filter(w => w.length >= 3 && !DOSE_VIDE.has(w)), plein: 0 });
  const arts = (r.courses || []).map(([a, , ix]) => art(a, ix));
  /* les lignes qu'aucun article de courses ne couvre (ex. « 1 c. à soupe d'huile neutre ») : on prend leur nom, sans la quantité */
  const couvertes = new Set(arts.flatMap(x => x.ix));
  lignes.forEach((l, k) => {
    if (couvertes.has(k)) return;
    const m = l.replace(/\[\[(.+?)\]\]/g, '$1').match(UNIT), nom = (m ? l.slice(m[0].length) : l).replace(/\[\[(.+?)\]\]/g, '$1').replace(/^\s*(de |d’|d'|du |des )/i, '').split(/[,(:]| pour | ou /)[0];
    const x = art(nom, [k]); x.ph = x.ph.slice(0, 3); if (x.ph.length) arts.push(x);
  });
  const EXPLIQUE = /\b(sans (cette|ca|quoi|elle|lui)|sinon|pour (ne pas|que|eviter)|evite\w*|doit|doivent|meme taille|plutot que|au lieu)\b/;
  const utile = s => s.replace(/\*\*/g, '').split(/(?<=[.!?;])\s+|\s+—\s+/).filter(p => !EXPLIQUE.test(norm(p))).join(' ');
  const etapes = r.steps.map(s => {
    const W = motsDose(utile(s)).filter(PETITS), pris = W.map(() => false), vus = new Set();
    /* 1. le nom complet (« huile de sésame », « citron vert ») */
    [...arts].sort((x, y) => y.ph.length - x.ph.length).forEach(x => {
      if (!x.ph.length) return;
      for (let i = 0; i + x.ph.length <= W.length; i++) {
        if (x.ph.every((w, j) => W[i + j] === w && !pris[i + j])) { x.ph.forEach((_, j) => { pris[i + j] = true; }); vus.add(x); x.plein++; break; }
      }
    });
    return { W, pris, vus };
  });
  /* 2. un mot distinctif (« les asperges », « le riz ») ; mot partagé par deux ingrédients : on garde celui qu'on n'a pas encore vu en entier */
  etapes.forEach(e => {
    e.W.forEach((w, i) => {
      if (e.pris[i]) return;
      const cand = arts.filter(x => !e.vus.has(x) && x.tk.includes(w));
      if (!cand.length) return;
      const pas = cand.filter(x => !x.plein), choix = cand.length === 1 ? cand : pas.length === 1 ? pas : [];
      if (choix.length) { e.vus.add(choix[0]); e.pris[i] = true; }
    });
  });
  /* un ingrédient sur plusieurs lignes (ex. huile d'olive en deux fois) : la n-ième étape qui le cite prend la n-ième ligne */
  const out = etapes.map(() => new Set());
  arts.forEach(x => {
    const ou = etapes.map((e, i) => e.vus.has(x) ? i : -1).filter(i => i >= 0);
    ou.forEach((i, n) => { (ou.length === x.ix.length && x.ix.length > 1 ? [x.ix[n]] : x.ix).forEach(k => out[i].add(k)); });
  });
  return (DOSES[r.id] = out.map(s => [...s].sort((a, b) => a - b)));
}
/* on ne montre que les ingrédients qui entrent en jeu pour la première fois, et seulement quand l'étape assemble quelque chose :
   au moins deux nouveaux, ou un seul si l'étape mélange, enrobe, ajoute… (rien pour « couper », « cuire », « servir ») */
const ASSEMBLE = /\b(melang\w*|enrob\w*|ajout\w*|verse\w*|incorpor\w*|assaisonn\w*|marin\w*|fouett\w*|delay\w*|saupoudr\w*|arros\w*|badigeonn\w*|parsem\w*|garni\w*|farci\w*|napp\w*|lier|monter|laquer)\b/;
const DOSES_ETAPE = {};
function dosesEtape(r) {
  if (DOSES_ETAPE[r.id]) return DOSES_ETAPE[r.id];
  const vu = new Set();
  return (DOSES_ETAPE[r.id] = dosesDe(r).map((ks, i) => {
    const neufs = ks.filter(k => !vu.has(k)); ks.forEach(k => vu.add(k));
    return neufs.length >= 2 || (neufs.length === 1 && ASSEMBLE.test(norm(r.steps[i].replace(/\*\*/g, '')))) ? neufs : [];
  }));
}
