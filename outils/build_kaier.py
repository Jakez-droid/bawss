#!/usr/bin/env python3
"""Kaier : construit le cahier de recettes public (dossier kaier/) à partir des recettes de Bawss.

Source : la constante RECIPES de ../index.html (elle-même synchronisée depuis Notion par sync_app.py).
Usage : python3 outils/build_kaier.py      (depuis la racine du dépôt)

Produit :
  kaier/index.html          l'appli (gabarit kaier/src/app.html + données)
  kaier/img/<id>-s.webp     vignettes (520 px) et <id>.webp (1100 px)
  kaier/r/<id>.html         pages de partage (aperçu WhatsApp/iMessage) qui ouvrent la recette
  kaier/sw.js               cache hors ligne
"""
import hashlib, json, os, re, sys
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = os.path.join(ROOT, 'kaier')
URL = 'https://jakez-droid.github.io/bawss/kaier/'

# Expressions bretonnes gardées pour la version publique (les plus crues restent dans Bawss)
EXCLURE_EXPR = re.compile(r'\b(cul|rar|seins|bronou|bromou|caguer|chier|caca|corkidu)\b', re.I)


def load():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    m = re.search(r'const RECIPES = (\[.*?\]);\nconst EXPRESSIONS = (\[.*?\]);', html, re.S)
    if not m:
        sys.exit('RECIPES introuvable dans index.html')
    R = json.loads(m.group(1).replace('<\\/', '</'))
    E = json.loads(m.group(2).replace('<\\/', '</'))
    p = re.search(r"const PETITE = ['\"]([^'\"]+)['\"]", html)
    v = re.search(r'const VITRINE = (\[.*?\]);', html)
    b = re.search(r'const EN_BAS = (\[.*?\]);', html)
    ordre = {'vitrine': json.loads(v.group(1)) if v else [], 'bas': json.loads(b.group(1)) if b else []}
    return R, E, (p.group(1) if p else None), ordre


def effort(s):
    return re.sub(r'^[^\wÀ-ÿ]+', '', s or '').strip()


def base_serves(s):
    m = re.search(r'\d+', s or '')
    return int(m.group()) if m else None


def images(r):
    src = r.get('photo')
    if not src:
        return None
    path = os.path.join(ROOT, src)
    if not os.path.exists(path):
        return None
    h = hashlib.md5(open(path, 'rb').read()).hexdigest()[:6]
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    out = {}
    for suffix, size, q in (('-s', 560, 72), ('', 1200, 78)):
        name = f"img/{r['id']}{suffix}-{h}.webp"
        dst = os.path.join(K, name)
        if not os.path.exists(dst):
            c = im.copy(); c.thumbnail((size, size)); c.save(dst, 'WEBP', quality=q, method=6)
        out['s' if suffix else 'l'] = name
    # couleur dominante pour le fond pendant le chargement
    px = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    out['c'] = '#%02x%02x%02x' % px
    out['og'] = URL.replace('kaier/', '') + src
    return out


def esc(s):
    return (s or '').replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def plain(s):
    s = re.sub(r'\*\*(.+?)\*\*', r'\1', s or '')
    s = re.sub(r'\[\[(.+?)\]\]', r'\1', s)
    return re.sub(r'\[(.+?)\]\(.+?\)', r'\1', s)


def main():
    R, E, petite, ordre = load()
    os.makedirs(os.path.join(K, 'img'), exist_ok=True)
    os.makedirs(os.path.join(K, 'r'), exist_ok=True)
    out = []
    for r in R:
        im = images(r)
        out.append({
            'id': r['id'], 't': r['title'], 'e': r.get('emoji') or '🍽️',
            'type': r.get('type') or '', 'base': r.get('base') or [], 'orig': r.get('origine') or [],
            'saison': r.get('saison') or [], 'effort': effort(r.get('effort')),
            'pantheon': 'panth' in (r.get('statut') or '').lower(),
            'intro': r.get('intro') or '', 'tip': r.get('tip') or '', 'serves': r.get('serves') or '',
            'n': base_serves(r.get('serves')), 'ingr': r['ingr'], 'steps': r['steps'], 'notes': r.get('notes') or [],
            'courses': r.get('courses') or [], 'shop': r.get('shop'),
            'img': {k: v for k, v in (im or {}).items() if k in ('s', 'l', 'c')} or None,
        })
        # page de partage
        desc = plain(r.get('intro') or r.get('tip') or 'Une recette testée par Jakez, à refaire chez toi.')[:190]
        og = (im or {}).get('og') or URL + 'icons/icon-512.png'
        page = f'''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(r['title'])} · Kaier</title><meta name="description" content="{esc(desc)}"><meta property="og:type" content="article"><meta property="og:site_name" content="Kaier, le cahier de recettes de Jakez"><meta property="og:title" content="{esc(r['emoji'] or '')} {esc(r['title'])}"><meta property="og:description" content="{esc(desc)}"><meta property="og:image" content="{og}"><meta property="og:url" content="{URL}r/{r['id']}.html"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#12304A"><link rel="icon" href="../icons/favicon-32.png"><script>location.replace("../"+location.search+"#/r/{r['id']}")</script></head><body style="background:#12304A;color:#fff;font-family:system-ui,sans-serif;padding:24px"><a style="color:#FFC72C" href="../#/r/{r['id']}">{esc(r['title'])} : ouvrir la recette</a></body></html>'''
        open(os.path.join(K, 'r', r['id'] + '.html'), 'w', encoding='utf-8').write(page)

    expr = [e for e in E if not EXCLURE_EXPR.search(e['br'] + ' ' + e['fr'])]
    data = {'recettes': out, 'expr': expr, 'petite': petite, 'ordre': ordre}
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

    tpl = open(os.path.join(K, 'src', 'app.html'), encoding='utf-8').read()
    version = hashlib.md5((tpl + js).encode()).hexdigest()[:8]
    html = tpl.replace('/*__DATA__*/null', js).replace('__VERSION__', version)
    open(os.path.join(K, 'index.html'), 'w', encoding='utf-8').write(html)

    stats = os.path.join(K, 'src', 'stats.html')
    if os.path.exists(stats):
        titles = json.dumps({r['id']: r['t'] for r in out}, ensure_ascii=False)
        open(os.path.join(K, 'stats.html'), 'w', encoding='utf-8').write(
            open(stats, encoding='utf-8').read().replace('/*__TITRES__*/{}', titles))

    # service worker
    keep = {f"img/{os.path.basename(p)}" for r in out if r['img'] for p in (r['img']['s'], r['img']['l'])}
    for f in os.listdir(os.path.join(K, 'img')):
        if f"img/{f}" not in keep:
            os.remove(os.path.join(K, 'img', f))
    base = ['./', 'manifest.webmanifest', 'fonts/gloock.woff2', 'fonts/figtree.woff2', 'fonts/figtree-ext.woff2',
            'icons/icon-192.png', 'icons/apple-touch-icon.png'] + sorted(r['img']['s'] for r in out if r['img'])
    sw = open(os.path.join(K, 'src', 'sw.js'), encoding='utf-8').read()
    sw = sw.replace('__VERSION__', version).replace('__BASE__', json.dumps(base))
    open(os.path.join(K, 'sw.js'), 'w', encoding='utf-8').write(sw)
    print(f'{len(out)} recettes, {sum(1 for r in out if r["img"])} photos, {len(expr)} expressions, version {version}')


if __name__ == '__main__':
    main()
