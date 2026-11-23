# Lots · CRM-BTP

La V1 décrite dans `INTENT.md`, découpée en lots. Un lot = une chose que l'utilisateur fait de bout en bout, de l'écran à la base, livrée en une PR. Le lot 1 est le plus petit.

## Choix de cadrage
Points qu'`INTENT.md` ne précise pas, tranchés au découpage :
- **Séquence** : 3 e-mails. Le délai avant « Perdu » (7 jours par défaut, réglable) démarre après le 3ᵉ.
- **Lead « chaud »** : une action (ouvert, cliqué, page visitée) dans les 48 dernières heures, selon l'horloge de l'app.

## Lot 1 · Ajouter un lead et le voir dans « Nouveau »
**Parcours** : j'ouvre l'app et je vois le tableau avec ses 7 colonnes d'étape. Je clique sur « Ajouter un lead » et je remplis nom, entreprise, métier, ville, e-mail et téléphone. Le lead apparaît dans la colonne « Nouveau ».
- [ ] Étant donné le tableau vide, quand j'ajoute un lead valide, alors il apparaît dans la colonne « Nouveau ».
- [ ] Étant donné le formulaire, quand je valide sans nom, alors le lead est refusé avec « Le nom est obligatoire », relié au champ.
- [ ] Étant donné le formulaire, quand je saisis un e-mail invalide, alors le lead est refusé avec un message sur le champ e-mail.
- [ ] Étant donné un lead ajouté, quand je redémarre l'app, alors il est toujours dans « Nouveau ».

## Lot 2 · Ouvrir la fiche d'un lead, la modifier et voir son historique
**Parcours** : je clique sur une carte et la fiche du lead s'ouvre avec toutes ses infos et son historique (quoi, quand). Je modifie un champ et j'enregistre.
- [ ] Étant donné un lead, quand j'ouvre sa fiche, alors je vois ses 6 champs et son historique, qui commence par « Lead créé » avec la date.
- [ ] Étant donné une fiche, quand je change la ville et que j'enregistre, alors la carte et la fiche montrent la nouvelle ville, y compris après redémarrage.
- [ ] Étant donné une fiche, quand j'efface le nom et que j'enregistre, alors la modification est refusée avec le même message qu'à l'ajout.

## Lot 3 · Simuler l'envoi de la séquence d'e-mails
**Parcours** : sur la fiche d'un lead, j'envoie l'e-mail suivant de la séquence (1, 2, puis 3). L'envoi passe par le fournisseur d'e-mails, ici un faux qui enregistre l'envoi sans rien expédier. Le lead passe dans « E-mail envoyé ».
- [ ] Étant donné un lead « Nouveau », quand je simule l'envoi de l'e-mail 1, alors il passe dans « E-mail envoyé », et l'historique montre « E-mail 1 envoyé » avec la date.
- [ ] Étant donné un lead qui a reçu les e-mails 1 et 2, quand j'envoie l'e-mail suivant, alors c'est l'e-mail 3.
- [ ] Étant donné un lead qui a reçu les 3 e-mails, quand j'ouvre sa fiche, alors l'envoi n'est plus proposé (« Séquence terminée »).
- [ ] Étant donné un envoi simulé, alors il est passé par le fournisseur d'e-mails (le faux fournisseur l'a enregistré).

## Lot 4 · Simuler une action du destinataire et voir le lead avancer
**Parcours** : sur la fiche, je simule « e-mail ouvert », « lien cliqué », « page visitée » ou « RDV pris ». La simulation fabrique un événement signé avec le secret partagé et prend le même chemin qu'un vrai webhook dans le service. Le lead avance, et sa carte montre s'il est « chaud ».
- [ ] Étant donné un lead « E-mail envoyé », quand je simule « e-mail ouvert », alors il passe dans « Ouvert » et l'historique montre l'événement.
- [ ] Étant donné un lead « Page visitée », quand je simule « e-mail ouvert », alors il reste dans « Page visitée » (il n'avance que vers l'avant), mais l'événement est gardé dans l'historique.
- [ ] Étant donné un lead, quand je simule « RDV pris », alors il passe dans « Gagné ».
- [ ] Étant donné un lead avec une action dans les 48 dernières heures, alors sa carte porte le badge « Chaud ». Sans action récente, pas de badge.

## Lot 5 · Recevoir un vrai webhook signé
**Parcours** : un service extérieur envoie un événement (ouvert, cliqué, page visitée, RDV pris) à l'adresse webhook de l'app, signé avec le secret partagé. Le lead avance sans que je touche à rien. Je peux l'essayer avec une commande `curl` documentée dans le README.
- [ ] Étant donné un lead « Ouvert », quand un webhook « lien cliqué » bien signé arrive, alors le lead passe dans « Lien cliqué ».
- [ ] Étant donné un webhook non signé ou mal signé, alors il est refusé (401) et aucun lead ne bouge.
- [ ] Étant donné un événement déjà reçu (même identifiant), quand il arrive une 2ᵉ fois, alors il n'est compté qu'une fois : pas de 2ᵉ ligne dans l'historique, pas d'avancée de plus.
- [ ] Étant donné un webhook « RDV pris » signé, alors le lead passe dans « Gagné ».
- [ ] Étant donné un événement mal formé (lead inconnu, type inconnu), alors il est refusé (400) sans rien modifier.

## Lot 6 · Simuler le passage du temps et voir un lead passer dans « Perdu »
**Parcours** : j'avance l'horloge de l'app (+1 jour, +7 jours) sans attendre. Un lead qui a reçu ses 3 e-mails sans aucune action passe dans « Perdu » une fois le délai écoulé. Je peux changer ce délai, qui est de 7 jours par défaut.
- [ ] Étant donné un lead qui a reçu ses 3 e-mails sans aucune action, quand j'avance l'horloge de 7 jours, alors il passe dans « Perdu ».
- [ ] Étant donné un lead qui a reçu une action pendant ces 7 jours, quand j'avance l'horloge, alors il ne passe pas dans « Perdu ».
- [ ] Étant donné un délai réglé à 3 jours, quand j'avance l'horloge de 3 jours, alors le lead sans action passe dans « Perdu ».
- [ ] Étant donné une horloge avancée, quand je redémarre l'app, alors la date simulée et les leads « Perdu » sont conservés.
- [ ] Étant donné un lead avec une action il y a 3 jours (selon l'horloge simulée), alors il n'a plus le badge « Chaud ».
