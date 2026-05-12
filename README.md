# ece-admin-app
 Application web de gestion des demandes d'inscription - Projet ECE

# Docker Setup

Configuration de developpement locale pour lancer l'application complete avec Docker Desktop.

## Prerequis

- Docker Desktop installe et lance
- Port `5432`, `3000` et `5173` disponibles sur la machine
- Aucun `npm install` local requis pour lancer via Docker

## Installation

1. Cloner le depot.
2. Creer un fichier `.env` depuis le modele :

```bash
cp .env.example .env
```

3. Renseigner les variables SMTP dans `.env` si l'envoi mail doit etre teste :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ece.inscriptions@gmail.com
SMTP_PASS=replace_with_google_app_password_without_spaces
MAIL_FROM="École ECE Narbonne — Service Inscriptions <ece.inscriptions@gmail.com>"
```

4. Lancer toute la stack :

```bash
docker compose up --build
```

Au demarrage du service `api`, Docker execute automatiquement :

- `npx prisma migrate deploy`
- `npx prisma generate`
- `npx prisma db seed` si `RUN_PRISMA_SEED=true`
- `npm run dev -w apps/api`

Le service `web` lance Vite en mode dev avec HMR.

## Acces

- Application web : http://localhost:5173
- API : http://localhost:3000
- Healthcheck API : http://localhost:3000/health
- PostgreSQL : `localhost:5432`

Identifiants admin par defaut en dev :

```text
Email: admin@example.com
Password: change-me-now
```

Ces valeurs se changent avec `ADMIN_EMAIL` et `ADMIN_PASSWORD` dans `.env`.

## Configuration Gmail SMTP pour les tests réels

Pour envoyer de vrais emails depuis Gmail, utiliser une adresse Gmail dediee aux inscriptions, par exemple `ece.inscriptions@gmail.com`. Activer la validation en deux etapes sur ce compte Google, puis generer un mot de passe d'application Google.

Coller ce mot de passe d'application dans le vrai fichier `.env`, sur `SMTP_PASS`, sans espaces. Ne jamais commiter le vrai `.env` ni un vrai secret. La valeur de `.env.example` doit rester un placeholder.

Apres modification de `.env`, redemarrer l'API Docker :

```bash
docker compose restart api
```

## Commandes Utiles

Demarrer la stack :

```bash
docker compose up --build
```

Demarrer en arriere-plan :

```bash
docker compose up --build -d
```

Voir les logs :

```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

Arreter les containers :

```bash
docker compose down
```

## Prisma

Executer les migrations dans le container API :

```bash
docker compose exec api npx prisma migrate deploy
```

Generer le client Prisma :

```bash
docker compose exec api npx prisma generate
```

Relancer le seed :

```bash
docker compose exec api npx prisma db seed
```

Ouvrir Prisma Studio :

```bash
docker compose exec api npx prisma studio --hostname 0.0.0.0
```

## Reset Docker Propre

Supprimer les containers et le volume PostgreSQL :

```bash
docker compose down -v
```

Reconstruire sans cache :

```bash
docker compose build --no-cache
docker compose up
```

## Notes De Developpement

- Les sources du monorepo sont montees dans `/app` pour le hot reload frontend et backend.
- Le volume Docker `node_modules` conserve les dependances installees dans les images et evite de melanger les `node_modules` macOS avec ceux des containers Linux.
- Dans Docker, le frontend proxifie `/api` vers `http://api:3000`. Hors Docker, Vite garde le proxy local vers `http://localhost:3000`.
- Le service `api` surcharge `DATABASE_URL` pour utiliser l'hote Docker `postgres`, tandis que `.env.example` garde une URL `localhost` compatible avec le developpement hors Docker.
