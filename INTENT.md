# Intention · CRM-BTP

## Produit
Une démo de mini CRM de suivi de leads froids, pour une seule personne.
Les leads sont des artisans et des entreprises du bâtiment.
Je leur envoie une séquence d'e-mails. Chaque action du destinataire
(e-mail ouvert, lien cliqué, page visitée, RDV pris) arrive par un webhook et fait avancer
le lead à l'étape suivante, sans que je le saisisse à la main.
Je vois d'un coup d'œil où en est chaque lead et qui est « chaud ».

## Étapes d'un lead
Nouveau → E-mail envoyé → Ouvert → Lien cliqué → Page visitée → Gagné (RDV pris).
Perdu : aucune action enregistrée 7 jours après le dernier e-mail de la séquence (délai réglable).
Une action reçue pendant ce délai garde le lead en vie.
Un lead n'avance que vers l'avant : un événement qui correspond à une étape déjà passée ne le fait pas reculer.
Chaque événement reçu est gardé dans l'historique du lead (quoi, quand).

## Lead
Nom, entreprise, métier (maçon, électricien, plombier…), ville, e-mail, téléphone.

## Architecture
3 couches : présentation, service, données. Seule la couche données parle à la base.
Le webhook est une porte d'entrée comme l'écran : il passe par le service, qui valide l'événement.
L'envoi d'e-mails passe par un fournisseur derrière une interface, remplaçable sans toucher au reste.
Les règles métier (passage d'étape, événements en double, fin de séquence) ont des tests unitaires.

## Contraintes
Next.js, composants shadcn, déploiement sur Vercel. SQLite en local, Turso en prod.
Un seul utilisateur. Aucun secret dans le code : clés en variables d'environnement.
Un webhook n'est accepté que s'il est signé avec le secret partagé.
Un même événement reçu deux fois ne compte qu'une fois.
C'est une démo : uniquement des données fictives, jamais de vrais prospects.

## Première version
- Ajouter, voir, modifier un lead.
- Voir les leads par étape (kanban) et l'historique de chaque lead.
- Recevoir un webhook « ouvert », « cliqué », « page visitée », « RDV pris » qui fait avancer le lead.
- Simuler depuis l'app l'envoi des e-mails de la séquence et la réception d'un webhook, avec le même chemin que le vrai.
- Simuler le passage du temps, pour voir un lead passer dans « Perdu » sans attendre 7 jours.

## Hors périmètre (pour l'instant)
Envoi réel des e-mails (lot suivant, une fois la simulation validée).
Authentification, multi-utilisateur, gestion de droits (démo à données fictives).

## Critères d'acceptation
- J'ajoute un lead, il apparaît dans « Nouveau ».
- Je simule « e-mail ouvert » sur un lead « E-mail envoyé », il passe dans « Ouvert ».
- Un webhook « lien cliqué » signé fait avancer le lead ; un webhook non signé est refusé.
- Le même événement reçu deux fois ne fait avancer le lead qu'une fois.
- Un webhook « RDV pris » fait passer le lead dans « Gagné ».
- 7 jours après le dernier e-mail de la séquence, sans aucune action enregistrée, le lead passe dans « Perdu ».
- Une action reçue pendant ces 7 jours : le lead ne passe pas dans « Perdu ».
- Après redémarrage, les leads et leur historique sont toujours là.
