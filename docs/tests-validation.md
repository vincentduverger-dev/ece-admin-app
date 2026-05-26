# Tests validation

Ce document décrit la première stratégie de tests automatisés ajoutée pour AH Admin App.

## Outils utilisés

- Vitest pour les tests unitaires et les tests API légers côté `apps/api`.
- Supertest pour tester l'application Express sans démarrer de serveur HTTP réel.
- Mocks Vitest pour isoler les tests d'authentification admin de Prisma et de la base PostgreSQL.

## Tests ajoutés

- `apps/api/tests/password-hash.test.ts`
  - vérifie le hachage scrypt d'un mot de passe fictif ;
  - vérifie l'acceptation du bon mot de passe ;
  - vérifie le rejet d'un mauvais mot de passe et d'un hash malformé.

- `apps/api/tests/admin-auth.test.ts`
  - vérifie la normalisation des emails admin ;
  - vérifie la validation d'identifiants admin avec un hash scrypt fictif ;
  - vérifie la création et la validation d'un token admin HMAC ;
  - vérifie le rejet d'un token altéré ou invalide.

- `apps/api/tests/csv-import.test.ts`
  - vérifie la normalisation de niveaux scolaires importés depuis CSV ;
  - vérifie la détection de familles doublons à partir de données de contact normalisées.

- `apps/api/tests/api.test.ts`
  - vérifie que `GET /health` retourne `200` ;
  - vérifie qu'une route métier protégée retourne `401` sans token ;
  - vérifie que `POST /api/auth/login` refuse des identifiants invalides.

## Commandes

Depuis la racine du monorepo :

```bash
npm run test -w apps/api
npm run test:watch -w apps/api
npm run build -w apps/api
npm run build -w apps/web
```

## Limites actuelles

- Les tests API restent légers et ne couvrent pas les flux métier complets.
- Les tests ne se connectent pas à PostgreSQL et ne valident pas les requêtes Prisma réelles.
- Les tests d'import CSV couvrent seulement des helpers isolés, pas un import complet avec persistance.
- Aucun test frontend automatisé n'a encore été ajouté.
- Aucune intégration CI n'est configurée dans cette étape.

## Pistes d'évolution

- Ajouter des tests e2e Playwright pour les parcours critiques côté web.
- Ajouter une CI GitHub Actions exécutant les builds et les tests à chaque pull request.
- Ajouter des tests d'intégration DB avec une base PostgreSQL dédiée ou lancée via Docker Compose.
- Étendre les tests API aux routes de gestion des dossiers, années scolaires et emails.
- Ajouter des tests frontend React avec Vitest et Testing Library si les composants deviennent plus complexes.
