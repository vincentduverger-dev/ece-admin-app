Codex Context — Projet ECE

1. Vue d’ensemble du projet

Nom du projet

ECE Admin App

Finalité

Application web d’administration pour gérer les demandes d’inscription d’un établissement scolaire.

Nature du produit

Back-office interne utilisé par l’administration / direction.

MVP

Le MVP doit permettre de :
	•	importer des demandes d’inscription depuis un fichier CSV exporté de Google Forms
	•	visualiser les demandes
	•	filtrer les demandes
	•	consulter le détail d’une demande
	•	changer le statut d’une demande
	•	marquer une demande comme prioritaire
	•	prendre une décision finale : acceptation ou refus
	•	envoyer un email de décision à la famille
	•	gérer les années scolaires
	•	gérer les niveaux et les places disponibles
	•	afficher un tableau de bord simple

Hors périmètre MVP
	•	paiement en ligne
	•	espace parents
	•	dépôt de documents
	•	signature électronique
	•	facturation / administratif avancé

⸻

2. Utilisateur cible

Utilisateur principal

Administration / direction de l’école.

Contraintes UX

L’application doit favoriser une prise de décision rapide.

Principes UX clés :
	•	interface claire
	•	lecture rapide
	•	filtrage simple
	•	actions principales visibles
	•	statuts toujours visibles
	•	surcharge visuelle minimale

⸻

3. Stack technique

Frontend
	•	React
	•	Vite
	•	TypeScript
	•	Tailwind CSS

Backend
	•	Node.js
	•	Express
	•	TypeScript

Base de données
	•	PostgreSQL
	•	Prisma ORM

Emails
	•	Nodemailer

Environnement
	•	Docker Compose

Déploiement cible

Déploiement local sur la machine de l’établissement.

⸻

4. Architecture actuelle du dépôt

apps/
  web/
  api/
prisma/
docs/
.github/

Rôle des dossiers
	•	apps/web : interface d’administration
	•	apps/api : API REST backend
	•	prisma : schéma, migrations, seed
	•	docs : documentation projet, contexte métier, conventions

⸻

5. Workflow Git à respecter

Branches
	•	main : branche stable, toujours propre
	•	dev : branche d’intégration
	•	feature/* : une branche par tâche ou fonctionnalité

Règles
	•	ne jamais travailler directement sur main
	•	éviter de travailler directement sur dev
	•	créer une branche feature/... pour chaque tâche
	•	ouvrir une PR vers dev
	•	merger vers main uniquement quand dev est stable

Exemples de branches
	•	feature/prisma-schema
	•	feature/prisma-migration-init
	•	feature/seed-levels
	•	feature/api-levels
	•	feature/dashboard-stats
	•	feature/csv-import-preview

Commits

Convention recommandée :
	•	feat(api): add levels endpoint
	•	feat(database): add prisma schema
	•	fix(import): normalize child birth date
	•	refactor(web): simplify dashboard cards
	•	docs: update codex project context
	•	chore: configure docker compose

⸻

6. Manière attendue de travailler avec Codex

Règle principale

Codex ne doit pas improviser l’architecture ni le métier.

Il doit :
	•	respecter strictement la structure existante
	•	produire des changements ciblés
	•	limiter le périmètre à la tâche demandée
	•	ne pas refactorer massivement sans demande explicite
	•	ne pas introduire de dépendance inutile
	•	ne pas changer les noms métier sans justification
	•	ne jamais toucher aux secrets ou aux fichiers .env

Ce qu’on attend dans chaque réponse de Codex

Quand une tâche de code est demandée, Codex doit idéalement :
	1.	rappeler brièvement l’objectif technique
	2.	lister les fichiers créés / modifiés
	3.	implémenter seulement ce qui est demandé
	4.	garder TypeScript strict
	5.	proposer une courte checklist de validation

Ce qu’il doit éviter
	•	générer du code mort
	•	ajouter des abstractions prématurées
	•	créer de gros fichiers monolithiques quand un découpage simple suffit
	•	supposer des routes ou des champs métier non définis
	•	renommer les entités métier validées

⸻

7. Contexte métier indispensable

Entités métier principales
	•	SchoolYear : année scolaire active ou historique
	•	Family : informations parents / contact
	•	Application : demande d’inscription
	•	Student : enfant lié à une demande
	•	Level : niveau / classe demandée
	•	ApplicationEmailLog : traçabilité des emails envoyés

Cycle métier d’une demande

Statuts principaux :
	•	RECEIVED
	•	IN_REVIEW
	•	ACCEPTED
	•	REFUSED

Priorité

Le caractère prioritaire n’est pas un statut.
C’est un marqueur booléen sur la demande :
	•	isPriority = true | false

Décision

Une demande peut recevoir une décision finale :
	•	acceptation
	•	refus

La décision doit être historisée avec :
	•	date de décision
	•	note éventuelle

⸻

8. Particularité critique du CSV

Le fichier CSV source provient d’un Google Form.

Contraintes importantes
	•	1 ligne CSV = 1 demande
	•	une demande peut contenir de 1 à 4 enfants
	•	les données doivent être normalisées à l’import
	•	certaines colonnes sont inutiles et doivent être ignorées
	•	il faut détecter les doublons potentiels

Implication technique

À l’import :
	•	créer 1 Family
	•	créer 1 Application
	•	créer plusieurs Student si nécessaire

Transformations attendues
	•	parsing des dates
	•	extraction du nombre d’enfants
	•	trim des chaînes
	•	normalisation du sexe
	•	harmonisation des classes / niveaux
	•	gestion des champs vides à null

⸻

9. Routes API cibles

Auth
	•	POST /api/auth/login
	•	POST /api/auth/logout
	•	GET /api/auth/me

Dashboard
	•	GET /api/dashboard
	•	GET /api/dashboard/stats
	•	GET /api/dashboard/status-summary
	•	GET /api/dashboard/levels-summary
	•	GET /api/dashboard/priority-applications

Applications
	•	GET /api/applications
	•	GET /api/applications/:id
	•	PATCH /api/applications/:id
	•	PATCH /api/applications/:id/status
	•	PATCH /api/applications/:id/priority
	•	PATCH /api/applications/:id/decision
	•	GET /api/applications/:id/email-logs

Levels
	•	GET /api/levels
	•	GET /api/levels/:id
	•	POST /api/levels
	•	PATCH /api/levels/:id
	•	PATCH /api/levels/:id/available-places

School years
	•	GET /api/school-years
	•	GET /api/school-years/active
	•	POST /api/school-years
	•	PATCH /api/school-years/:id
	•	PATCH /api/school-years/:id/activate

Imports CSV
	•	POST /api/imports/csv
	•	POST /api/imports/csv/preview
	•	POST /api/imports/csv/confirm

Emails
	•	POST /api/applications/:id/send-email
	•	GET /api/email-logs

⸻

10. Frontend — pages cibles du MVP

Pages prioritaires :
	•	/login
	•	/dashboard
	•	/applications
	•	/applications/:id
	•	/applications/:id/email
	•	/imports
	•	/imports/new
	•	/school-years
	•	/levels

Pages secondaires :
	•	/families
	•	/students
	•	/email-logs
	•	/settings

⸻

11. Design system à respecter

ADN visuel
	•	institutionnel
	•	moderne
	•	clair
	•	orienté décision rapide

Couleurs principales
	•	primary: #1F4D3A
	•	primaryDark: #16382A
	•	primaryLight: #2F6B52
	•	secondary: #D4A24C
	•	background: #F8F6F2
	•	border: #E5E7EB

Couleurs métier
	•	demande reçue : gris
	•	en cours d’étude : bleu/vert
	•	acceptée : vert
	•	refusée : rouge
	•	prioritaire : orange

Typographie
	•	Inter

Principes UI
	•	badges de statut visibles
	•	cards simples
	•	tableaux lisibles
	•	filtres rapides
	•	zéro surcharge décorative

⸻

12. Conventions backend

Structure souhaitée

apps/api/src/
  app/
  config/
  lib/
  middlewares/
  modules/
    auth/
    dashboard/
    applications/
    levels/
    school-years/
    imports/
    emails/
  prisma/
  routes/
  types/
  utils/

Règles backend
	•	séparer route / controller / service quand cela apporte de la clarté
	•	garder les handlers fins
	•	mettre la logique métier dans des services
	•	valider les entrées
	•	retourner des réponses JSON propres et stables
	•	gérer les erreurs de façon centralisée

⸻

13. Conventions frontend

Structure souhaitée

apps/web/src/
  app/
  components/
  features/
  pages/
  lib/
  styles/

Règles frontend
	•	composants petits et lisibles
	•	pas de logique métier lourde dans les composants visuels
	•	centraliser les appels API
	•	garder des types explicites
	•	réutiliser les composants d’interface

⸻

14. Définition of Done

Une tâche est terminée seulement si :
	•	elle respecte le périmètre demandé
	•	le code compile
	•	le lint passe si disponible
	•	le comportement est testable manuellement
	•	les fichiers modifiés sont cohérents avec l’architecture
	•	aucun secret n’est commité
	•	une PR propre peut être ouverte

⸻