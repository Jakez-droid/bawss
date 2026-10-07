# Version test (oct. 2026) — pas encore en ligne

Branche `version-test`, en attente de la validation de Jakez. Rien ici ne touche `main` ni le site.

- `patch_source.py SOURCE.html OUT.html` : applique à la page de l'artifact « Les recettes 2 Jakez » les changements de la version test
  (doses en mode cuisine seulement quand une étape assemble des ingrédients, via `doses.js` ; rangées « Tes favoris » et
  « Ce soir, vite fait » (les plats express les plus simples) ; rangée « Les bases » sous la grille (focaccia et ragù restent dans la grille) ;
  recherche sans résultat avec « Je veux cette recette » ; temps estimés en minutes ; onglets Recettes · Favoris · Courses · Moi ; couvertures d'une seule teinte).
- Les changements côté Bawss sont dans `outils/pwa.js`, `pwa.css`, `chat.js`, `patch_compte.py` de cette branche
  (bande-annonce au 1er lancement seulement ; compte proposé au 1er lancement, à la 3e visite et à chaque favori ; écrans compte en clair ;
  demandes de recettes : écran « Demande une recette », liste pour Jakez dans Mon compte, SQL dans `outils/supabase_demandes.sql`).
- `test-supabase.js` : faux Supabase pour l'aperçu de test (comptes simulés dans le navigateur ; le pseudo « Jakez » y a les droits admin). Ne jamais le mettre en ligne à la place de `supabase.js`.

Aperçu : https://claude.ai/artifact/X8MmSqXuxtDbPA34GG1QSf

À la validation : republier l'artifact avec `patch_source.py`, reconstruire avec `build_pwa.py`, fusionner dans `main`,
lancer `supabase_demandes.sql` dans Supabase, et ajouter la colonne Temps dans Notion (sinon `sync_app.py` doit garder `temps` / `repos` existants).
