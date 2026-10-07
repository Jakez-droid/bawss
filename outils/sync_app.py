#!/usr/bin/env python3
import argparse, base64, io, json, re, sys, unicodedata

def slug(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-zA-Z0-9]+', '-', s.lower()).strip('-')

def norm(s):
    s = s.replace('œ', 'oe').replace('Œ', 'oe')
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

RAYON = {'Fruits & légumes': 'fl', 'Frais': 'fr', 'Sec & placard': 'se', 'Épices': 'ep', 'Autre': 'au'}
STOP = {'de', 'du', 'des', 'la', 'le', 'les', 'a', 'l', 'd', 'en', 'aux', 'au', 'et', 'japonaise', 'kewpie'}

def match(article, line):
    """L'article de courses correspond-il à cette ligne d'ingrédient ? (ignore les liens vers d'autres recettes)"""
    line = re.sub(r'\[\[(.+?)\]\]', lambda m: m.group(1) if norm(m.group(1)) == norm(article) else '', line)
    words = norm(line).split()
    toks = [t for t in norm(re.sub(r'\(.*?\)', '', article)).split() if t not in STOP]
    return all(any(w == t or w.rstrip('sx') == t.rstrip('sx') for w in words) for t in toks)

def courses(r):
    """[[article, rayon]] -> [[article, code rayon, [index des lignes d'ingrédients]]]"""
    lines = [it for g in r['ingr'] for it in g['items']]
    out = []
    for c in r['courses']:
        a, rz = c[0], c[1]
        if a in [x[0] for x in out]:
            continue
        out.append([a, RAYON.get(rz, rz if rz in RAYON.values() else 'au'), [k for k, l in enumerate(lines) if match(a, l)]])
    return out

def photo_data_uri(path):
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    im.thumbnail((1000, 1000))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=76, optimize=True, progressive=True)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()

REQUIRED = ['title', 'emoji', 'type', 'base', 'origine', 'saison', 'effort', 'statut',
            'source', 'tip', 'serves', 'ingr', 'steps', 'notes']

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('page'); ap.add_argument('out')
    ap.add_argument('--upsert'); ap.add_argument('--delete', default='')
    ap.add_argument('--photo', action='append', default=[])
    ap.add_argument('--petite')
    a = ap.parse_args()

    html = open(a.page, encoding='utf-8').read()
    m = re.search(r'const RECIPES = (\[.*?\]);\nconst EXPRESSIONS', html, re.S)
    if not m:
        sys.exit('RECIPES introuvable dans la page')
    recipes = {r['id']: r for r in json.loads(m.group(1).replace('<\\/', '</'))}
    before = len(recipes)

    if a.upsert:
        for r in json.load(open(a.upsert, encoding='utf-8')):
            missing = [k for k in REQUIRED if k not in r]
            if missing:
                sys.exit(f"{r.get('title')}: champs manquants {missing}")
            r['id'] = r.get('id') or slug(r['title'])
            old = recipes.get(r['id']) or {}
            if 'intro' not in r:
                r['intro'] = old.get('intro', '')
            if old.get('photo') and not r.get('photo'):
                r['photo'] = old['photo']
            # temps total (minutes) et repos : propriétés « Temps (min) » et « Repos » de Notion ; sinon on garde ceux de l'app
            for k in ('temps', 'repos'):
                if k not in r and old.get(k):
                    r[k] = old[k]
            if 'courses' not in r:
                if old.get('courses'):
                    r['courses'] = [c[:2] for c in old['courses']]
                else:
                    print(f"ATTENTION {r['title']} : pas de liste de courses (champ courses manquant)")
                    r['courses'] = []
            r['courses'] = courses(r)
            recipes[r['id']] = r
    for rid in filter(None, a.delete.split(',')):
        recipes.pop(rid.strip(), None)
    for p in a.photo:
        rid, path = p.split('=', 1)
        if rid not in recipes:
            sys.exit(f'photo pour une recette inconnue : {rid}')
        recipes[rid]['photo'] = photo_data_uri(path)

    ordered = sorted(recipes.values(), key=lambda r: slug(r['title']))
    titles = {r['title'] for r in ordered}
    for r in ordered:
        texte = ' '.join([r.get('intro', ''), r.get('tip', '')] + [it for g in r['ingr'] for it in g['items']] + r['steps'] + r['notes'])
        for link in re.findall(r'\[\[(.+?)\]\]', texte):
            if link not in titles:
                print(f"ATTENTION lien mort dans {r['title']} -> {link}")
    data = json.dumps(ordered, ensure_ascii=False).replace('</', '<\\/')
    html = html[:m.start(1)] + data + html[m.end(1):]

    if a.petite:
        if a.petite not in recipes:
            sys.exit(f'petite dernière inconnue : {a.petite}')
        html, n = re.subn(r'const PETITE = "[^"]*";', f'const PETITE = {json.dumps(a.petite)};', html)
        if n != 1:
            sys.exit('PETITE introuvable')

    open(a.out, 'w', encoding='utf-8').write(html)
    print(f'{before} -> {len(ordered)} recettes, {sum(1 for r in ordered if r.get("photo"))} avec photo')

if __name__ == '__main__':
    main()
