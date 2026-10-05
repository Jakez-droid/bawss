# Outils de Bawss

- `sync_app.py` : met à jour les recettes dans la page de l'app (artifact Claude « Les recettes 2 Jakez »).
- `build_pwa.py APP.html ..` : transforme cette page en appli installable (`index.html` à la racine du dépôt), avec l'installation, les comptes et la synchro.
- `pwa.js`, `pwa.css` : le code ajouté par `build_pwa.py`.
- `build_kaier.py` : construit **Kaier** (`kaier/`), le cahier de recettes public sans inscription, à partir des recettes de `index.html`. Lancé tout seul par GitHub (workflow « Mettre à jour Kaier ») à chaque mise à jour des recettes.
- `supabase_kaier.sql` : le suivi anonyme de diffusion de Kaier (à coller une fois dans Supabase > SQL Editor). Stats sur `kaier/stats.html`.
- Gabarits de Kaier : `kaier/src/app.html`, `kaier/src/stats.html`, `kaier/src/sw.js`.
- `maj_pwa.py` : après une modif de `pwa.js`, `pwa.css`, `realisations.js`, `story.js` ou `chat.js`, remet à jour `index.html` et `sw.js` sans repasser par l'artifact.
- `patch_compte.py` : textes de la FAQ pour les comptes sans mail (pseudo + code), appliqués par `build_pwa.py` et `maj_pwa.py`.
- Comptes : pseudo seul. Le compte « pseudo + code » (pseudo@bawss.app + code généré) demande que **Confirm email soit désactivé** dans Supabase (Authentication > Sign In / Providers > Email). Sinon l'appli bascule sur un compte lié au téléphone (**Allow anonymous sign-ins** activé, même écran de Supabase).
