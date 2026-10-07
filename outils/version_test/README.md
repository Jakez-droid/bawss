# Version test (oct. 2026) — pas encore en ligne

Branche `version-test`, en attente de la validation de Jakez. Rien ici ne touche `main` ni le site.

- `patch_source.py SOURCE.html OUT.html` : applique à la page de l'artifact « Les recettes 2 Jakez » les changements de la version test
  (doses par étape dans le mode cuisine via `doses.js`, rangées « Tes favoris » / « Ce soir, vite fait », recherche sans résultat,
  temps estimés en minutes, onglets Recettes · Favoris · Courses · Moi, menu Moi, couvertures d'une seule teinte).
- Les changements côté Bawss sont dans `outils/pwa.js`, `pwa.css`, `chat.js`, `patch_compte.py` de cette branche
  (bande-annonce au 1er lancement seulement, compte proposé au 1er lancement puis à chaque favori, écrans compte en clair).
- `test-supabase.js` : faux Supabase pour l'aperçu de test (comptes simulés dans le navigateur). Ne jamais le mettre en ligne à la place de `supabase.js`.

Aperçu : https://claude.ai/artifact/X8MmSqXuxtDbPA34GG1QSf

À la validation : republier l'artifact avec `patch_source.py`, reconstruire avec `build_pwa.py`, fusionner dans `main`,
et ajouter la colonne Temps dans Notion (sinon `sync_app.py` doit garder `temps` / `repos` existants).
