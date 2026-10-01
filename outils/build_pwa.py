#!/usr/bin/env python3
"""build_pwa.py APP.html OUT_DIR : transforme la page de l'app en appli installable (index.html)."""
import sys, re, os, json
src, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
h = open(src, encoding='utf-8').read()
css = open(os.path.join(here, 'pwa.css'), encoding='utf-8').read()
js = open(os.path.join(here, 'pwa.js'), encoding='utf-8').read()
rz = os.path.join(here, 'realisations.js')
if os.path.exists(rz):
    st = os.path.join(here, 'story.js')
    ch = os.path.join(here, 'chat.js')
    extra = ''.join('\n' + open(f, encoding='utf-8').read() for f in (st, ch) if os.path.exists(f))
    js = js.replace('/*@REALISATIONS@*/', open(rz, encoding='utf-8').read() + extra)
meta = ('<html lang="fr"><head><meta charset="utf-8">'
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  '<title>Bawss · Les recettes 2 Jakez</title>'
  '<meta name="description" content="Les recettes testées et approuvées par ton Jakez.">'
  '<link rel="manifest" href="manifest.webmanifest">'
  '<meta name="theme-color" content="#15283A">'
  '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
  '<meta name="apple-mobile-web-app-title" content="Bawss">'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">'
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
  '<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">')
# en-tête de l'artifact -> vraie en-tête
h, n = re.subn(r'^<!doctype html><html><head><meta charset=utf8><meta name=viewport content="[^"]*">', '<!doctype html>' + meta, h)
assert n == 1, 'en-tête'
h, n = re.subn(r'<title>Les recettes 2 Jakez</title>\n', '', h, count=1); assert n == 1, 'title'
h = h.replace('</head><body>', '<style>\n' + css + '</style></head><body>', 1)
# l'intro ne part plus toute seule : l'écran d'accueil la lance
a = "(window.lancerIntro = (opts = {}) => {\n"
assert a in h, 'intro'
h = h.replace(a, "window.lancerIntro = (opts = {}) => {\n", 1)
h, n = re.subn(r"\n  \(\{ trailer, phare, bandit \}\)\[quelle\]\(\);\n\}\)\(\);\n", "\n  ({ trailer, phare, bandit })[quelle]();\n};\n", h); assert n == 1, 'fin intro'
assert "son = !!opts.son;" in h, 'son'

# bouton « mon compte » à côté du panier
k = '<button class="cart-btn" id="cart-btn"'
assert k in h
h = h.replace(k, '<button class="cart-btn me-btn" id="me-btn" type="button" aria-label="Me connecter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><span class="me-i"></span></button>' + k, 1)
# client Supabase, chargé avant le script de l'appli
g = '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>'
assert g in h
h = h.replace(g, g + '<script src="supabase.js"></script>', 1)
# recettes propres à Bawss (outils/extras.json) : ajoutées ou remplacées dans les données de la page
import json
ex = os.path.join(here, 'extras.json')
if os.path.exists(ex):
    m = re.search(r'const RECIPES = (\[.*?\]);\nconst EXPRESSIONS', h, re.S)
    assert m, 'RECIPES'
    R = json.loads(m.group(1).replace('<\\/', '</'))
    extras = json.load(open(ex, encoding='utf-8'))
    ids = {r['id'] for r in extras}
    R = [r for r in R if r['id'] not in ids] + extras
    h = h[:m.start(1)] + json.dumps(R, ensure_ascii=False).replace('</', '<\\/') + h[m.end(1):]
# pas de numéro de téléphone dans l'appli publique : « Appelle le bawss » devient le chat
h = re.sub(r'const BOSS_PHONE = "[^"]*";', 'const BOSS_PHONE = "chat";', h, count=1)
assert '<b>📞 Appelle le bawss</b>' in h, 'bouton SOS du mode cuisine introuvable'
h = h.replace('<b>📞 Appelle le bawss</b>', '<b>💬 Demande à ton Jakez</b>')
# script de l'appli installable, en dernier
i = h.rindex('</script>')
h = h[:i] + '\n' + js + h[i:]
os.makedirs(out, exist_ok=True)

# photos : sorties de la page en fichiers (page plus légère, aperçus WhatsApp possibles)
import base64, hashlib, html as H
SITE = 'https://jakez-droid.github.io/bawss/'
m = re.search(r'const RECIPES = (\[.*?\]);\nconst EXPRESSIONS', h, re.S)
R = json.loads(m.group(1).replace('<\\/', '</'))
os.makedirs(os.path.join(out, 'img'), exist_ok=True)
for f in os.listdir(os.path.join(out, 'img')):
    os.remove(os.path.join(out, 'img', f))
imgs = []
for r in R:
    ph = r.get('photo') or ''
    if ph.startswith('data:image/'):
        ext = 'jpg' if 'jpeg' in ph[:30] else ph[11:ph.index(';')]
        data = base64.b64decode(ph.split(',', 1)[1])
        nom = 'img/' + r['id'] + '-' + hashlib.md5(data).hexdigest()[:6] + '.' + ext
        open(os.path.join(out, nom), 'wb').write(data)
        r['photo'] = nom
        imgs.append(nom)
h = h[:m.start(1)] + json.dumps(R, ensure_ascii=False).replace('</', '<\\/') + h[m.end(1):]

# une petite page par recette : l'aperçu (photo + titre) que montrent WhatsApp, Messenger…, puis l'appli
os.makedirs(os.path.join(out, 'r'), exist_ok=True)
for f in os.listdir(os.path.join(out, 'r')):
    os.remove(os.path.join(out, 'r', f))
def texte(s):
    s = re.sub(r'\[\[(.+?)\]\]', r'\1', s or ''); s = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', s)
    return re.sub(r'\*\*', '', s).strip()
for r in R:
    t = H.escape(r['title'])
    d = H.escape(texte(r.get('intro')) or texte(r.get('tip'))[:180] or 'La recette testée et approuvée par ton Jakez.')
    img = SITE + (r['photo'] if r.get('photo') else 'icons/icon-512.png')
    open(os.path.join(out, 'r', r['id'] + '.html'), 'w', encoding='utf-8').write(
        '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        f'<title>{t} · Bawss</title><meta name="description" content="{d}">'
        f'<meta property="og:type" content="article"><meta property="og:site_name" content="Bawss · Les recettes 2 Jakez">'
        f'<meta property="og:title" content="{t}"><meta property="og:description" content="{d}">'
        f'<meta property="og:image" content="{img}"><meta property="og:url" content="{SITE}r/{r["id"]}.html">'
        f'<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#15283A">'
        f'<link rel="icon" href="../icons/favicon-32.png"><meta http-equiv="refresh" content="0;url=../#{r["id"]}">'
        f'<script>location.replace("../#{r["id"]}")</script></head>'
        f'<body style="background:#15283A;color:#fff;font-family:sans-serif;padding:24px"><a style="color:#F4B400" href="../#{r["id"]}">{t} : ouvrir la recette sur Bawss</a></body></html>')

# aperçu de l'accueil
h = h.replace('<link rel="manifest"', '<meta property="og:type" content="website"><meta property="og:site_name" content="Bawss"><meta property="og:title" content="Bawss · Les recettes 2 Jakez"><meta property="og:description" content="Enlève ton choupen, mets ton tablier et va dans ta cuisine. Les recettes testées et approuvées par ton Jakez."><meta property="og:image" content="' + SITE + 'icons/icon-512.png"><meta property="og:url" content="' + SITE + '"><link rel="manifest"', 1)

# service worker : garde l'appli et toutes les photos pour le hors-ligne ; nouveau nom de cache à chaque version
base = ['./', 'supabase.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'] + imgs
empreinte = hashlib.md5(h.encode('utf-8')).hexdigest()[:8]
sw = open(os.path.join(here, 'sw.template.js'), encoding='utf-8').read().replace('__CACHE__', 'bawss-' + empreinte).replace('__BASE__', json.dumps(base))
open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(h)
print('ok', len(h))
