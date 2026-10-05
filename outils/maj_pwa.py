#!/usr/bin/env python3
"""maj_pwa.py : remet à jour index.html après une modification de pwa.js / pwa.css / realisations.js / story.js / chat.js,
sans repartir de la page de l'artifact. À lancer depuis la racine du dépôt :
    python3 outils/maj_pwa.py ANCIEN_INDEX_SOURCES_DIR
Le script retrouve dans index.html le bloc construit à partir des anciennes sources (git HEAD) et le remplace."""
import hashlib, json, os, re, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
sys.path.insert(0, here)
from patch_compte import patch


def lire(nom, rev=None):
    if rev:
        return subprocess.run(['git', '-C', root, 'show', f'{rev}:outils/{nom}'], capture_output=True, text=True, check=True).stdout
    return open(os.path.join(here, nom), encoding='utf-8').read()


def construit(rev=None):
    js = lire('pwa.js', rev)
    extra = ''.join('\n' + lire(f, rev) for f in ('story.js', 'chat.js'))
    return js.replace('/*@REALISATIONS@*/', lire('realisations.js', rev) + extra), lire('pwa.css', rev)


rev = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
h = open(os.path.join(root, 'index.html'), encoding='utf-8').read()
vieux_js, vieux_css = construit(rev)
neuf_js, neuf_css = construit()
assert h.count(vieux_js) == 1, 'ancien script introuvable dans index.html'
assert h.count(vieux_css) == 1, 'ancien style introuvable dans index.html'
h = h.replace(vieux_js, neuf_js).replace(vieux_css, neuf_css)
h = patch(h)
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(h)
# nouveau nom de cache pour que les téléphones prennent la mise à jour
sw = open(os.path.join(root, 'sw.js'), encoding='utf-8').read()
base = re.search(r'const BASE = (\[.*?\]);', sw).group(1)
emp = hashlib.md5(h.encode('utf-8')).hexdigest()[:8]
sw = open(os.path.join(here, 'sw.template.js'), encoding='utf-8').read().replace('__CACHE__', 'bawss-' + emp).replace('__BASE__', base)
open(os.path.join(root, 'sw.js'), 'w', encoding='utf-8').write(sw)
print('ok', emp)
