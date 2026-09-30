#!/usr/bin/env python3
"""build_pwa.py APP.html OUT_DIR : transforme la page de l'app en appli installable (index.html)."""
import sys, re, os
src, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
h = open(src, encoding='utf-8').read()
css = open(os.path.join(here, 'pwa.css'), encoding='utf-8').read()
js = open(os.path.join(here, 'pwa.js'), encoding='utf-8').read()
meta = ('<html lang="fr"><head><meta charset="utf-8">'
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  '<title>Bawss · Les recettes 2 Jakez</title>'
  '<meta name="description" content="Les recettes testées et approuvées par Jakez.">'
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
a = "/* ---------- ouverture : trois intros en alternance (bande-annonce, phare, bandit manchot) ---------- */\n(() => {\n"
assert a in h, 'intro'
h = h.replace(a, a[:-9] + "window.lancerIntro = (opts = {}) => {\n", 1)
h, n = re.subn(r"\n  \(\{ trailer, phare, bandit \}\)\[quelle\]\(\);\n\}\)\(\);\n", "\n  ({ trailer, phare, bandit })[quelle]();\n};\n", h); assert n == 1, 'fin intro'
b = "let AC = null, son = false;"
assert b in h; h = h.replace(b, "let AC = null, son = !!opts.son;", 1)
c = "q('.son').addEventListener('click'"
assert c in h; h = h.replace(c, "if (son) { q('.son').classList.add('on'); q('.son').textContent = '🔊 Son'; }\n  " + c, 1)
# bouton « mon compte » à côté du panier
k = '<button class="cart-btn" id="cart-btn"'
assert k in h
h = h.replace(k, '<button class="cart-btn me-btn" id="me-btn" type="button" aria-label="Me connecter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg><span class="me-i"></span></button>' + k, 1)
# client Supabase, chargé avant le script de l'appli
g = '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>'
assert g in h
h = h.replace(g, g + '<script src="supabase.js"></script>', 1)
# script de l'appli installable, en dernier
i = h.rindex('</script>')
h = h[:i] + '\n' + js + h[i:]
os.makedirs(out, exist_ok=True)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(h)
print('ok', len(h))
