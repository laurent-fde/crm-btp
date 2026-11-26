# ADR 005 — Faux fournisseur d'e-mails derrière le port EmailSender

- Status: accepted
- Date: 2026-11-23 (écrit a posteriori le 2026-11-26, d'après le commit 1af3505)
- Scope: story lot-3

## Context
`INTENT.md` met l'envoi réel hors périmètre de la V1, mais demande que l'envoi passe par un fournisseur
remplaçable sans toucher au reste. La démo n'a que des données fictives.

## Decision
Le service envoie par le port `EmailSender`. En V1, `src/data/simulated-email-sender.ts` l'implémente :
il n'expédie rien et garde chaque envoi dans la table `sent_emails`. Le vrai fournisseur le remplacera
dans `composition.ts`.

## Considered options
- Envoi réel dès la V1 — rejected because hors périmètre de `INTENT.md` (lot suivant, une fois la
  simulation validée).

## Consequences
Les e-mails « envoyés » sont consultables en base, et aucun message ne part par erreur vers une vraie
adresse. Le passage au vrai fournisseur demandera un ADR (choix du service, gestion des échecs).
