
## Mission
Contribuer au projet Académie Horizon Admin App sans dériver du périmètre métier ni de l’architecture existante.

## Règles absolues
- Respecter le workflow Git : main / dev / feature/*
- Ne jamais modifier les secrets ou les fichiers `.env`
- Ne pas renommer les entités métier validées
- Ne pas refactorer massivement sans demande explicite
- Ne pas ajouter de dépendance sans justification
- Toujours limiter les changements au périmètre demandé

## Architecture
- `apps/web` : frontend React/Vite/TypeScript
- `apps/api` : backend Express/TypeScript
- `prisma` : schéma, migrations, seed

## Métier
Entités principales : SchoolYear, Family, Application, Student, Level, ApplicationEmailLog.

## Attendu dans chaque tâche
- fichiers modifiés clairement identifiés
- code propre et ciblé
- checklist de validation manuelle
