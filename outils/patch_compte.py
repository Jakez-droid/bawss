"""Textes de la FAQ adaptés aux comptes sans mail (pseudo + code). Utilisé par build_pwa.py et maj_pwa.py."""

REMPLACEMENTS = [
    ("Q('J’ai oublié mon mot de passe', '<p>Sur l’écran de connexion, touche <b>« Mot de passe oublié ? »</b> : tu reçois un lien pour en choisir un nouveau.</p>')",
     "Q('Il faut un compte ?', '<p>Non : toutes les recettes, le mode cuisine et la liste de courses marchent sans compte. Il en faut un seulement pour poster une photo, écrire à ton Jakez ou retrouver tes favoris sur un autre appareil. Et c’est juste un pseudo : pas de mail, pas de mot de passe à inventer.</p>')"
     " + Q('Comment je retrouve mon compte sur un autre téléphone ?', '<p>Dans <b>Mon compte</b> (le bonhomme en haut), tu as ton pseudo et ton <b>code</b>. Sur l’autre appareil, touche le bonhomme, puis <b>« J’ai déjà un compte »</b>, et mets les deux. Fais une capture d’écran du code, c’est le plus simple.</p>')"),
    ("Q('Vous m’envoyez des mails ?', '<p>Non. Le seul mail que tu peux recevoir, c’est celui que tu demandes toi-même (mot de passe oublié, changement d’adresse).</p>')",
     "Q('Vous m’envoyez des mails ?', '<p>Non, jamais. On ne te demande même pas ton adresse.</p>')"),
]


def patch(h):
    for a, b in REMPLACEMENTS:
        if a in h:
            h = h.replace(a, b, 1)
    return h
