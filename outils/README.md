# Outils de Bawss

- `sync_app.py` : met à jour les recettes dans la page de l'app (artifact Claude « Les recettes 2 Jakez »).
- `build_pwa.py APP.html ..` : transforme cette page en appli installable (`index.html` à la racine du dépôt), avec l'installation, les comptes et la synchro.
- `pwa.js`, `pwa.css` : le code ajouté par `build_pwa.py`.
- `maj_pwa.py` : après une modif de `pwa.js`, `pwa.css`, `realisations.js`, `story.js` ou `chat.js`, remet à jour `index.html` et `sw.js` sans repasser par l'artifact.
- `patch_compte.py` : textes de la FAQ pour les comptes sans mail (pseudo + code), appliqués par `build_pwa.py` et `maj_pwa.py`.
- Comptes : pseudo seul. Le compte « pseudo + code » (pseudo@bawss.app + code généré) demande que **Confirm email soit désactivé** dans Supabase (Authentication > Sign In / Providers > Email). Sinon l'appli bascule sur un compte lié au téléphone (**Allow anonymous sign-ins** activé, même écran de Supabase).
- `supabase_demandes.sql` : les demandes de recettes (« Je veux cette recette », menu Moi), visibles par Jakez dans Mon compte. À coller une fois dans Supabase > SQL Editor.
- Recettes : `temps` (minutes) et `repos` viennent des propriétés « Temps (min) » et « Repos » de Notion ; `sync_app.py` garde ceux de l'app s'ils manquent.
