# Gestion des inscriptions et badges événementiels

Application full-stack de gestion des inscriptions à des événements : organisateurs multi-tenant, formulaire d'inscription public, validation et envoi de badges avec QR code, scan d'entrée le jour J, et tableau de bord analytique.

## Stack

- **Client** : React 19 (JavaScript uniquement, pas de TypeScript) + Vite, React Router, TanStack Query, Mantine (formulaires publics, scan, tableau de bord), react-admin + MUI (back-office CRUD), Recharts, html5-qrcode.
- **Serveur** : Node.js + Express 5 (ES modules), Mongoose, JWT (cookie httpOnly), zod, nodemailer, qrcode, pdfkit, sharp, helmet, cors, express-rate-limit.
- **Base de données** : MongoDB (testé avec MongoDB Atlas). Les images (logos, photos de participants, fonds de badge) sont stockées en base, optimisées côté serveur — jamais en URL externe.

Le dépôt est un monorepo avec deux applications indépendantes (`/server`, `/client`) et un `package.json` racine qui les lance ensemble.

## Prérequis

- Node.js **22.16.0** exactement (voir `.nvmrc`). Les versions des dépendances sont épinglées pour cette version — `react-router` reste en version 7.x (pas la 8.x "latest", qui exige Node ≥ 22.22.0).
- Une base MongoDB accessible (Atlas, instance locale, ou autre). Docker n'est pas utilisé dans ce projet.
- npm (fourni avec Node).

## Installation

Depuis la racine du dépôt :

```bash
npm install          # installe concurrently à la racine
cd server && npm install
cd ../client && npm install
```

### Configuration des variables d'environnement

Copier les fichiers d'exemple et les remplir :

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

`server/.env` — voir le détail de chaque variable dans `server/.env.example` :

- `MONGODB_URI` : chaîne de connexion MongoDB (Atlas ou autre). **Ne jamais committer ce fichier.**
- `JWT_SECRET` : secret pour signer les JWT — à changer en production.
- `CLIENT_URL` / `PUBLIC_APP_URL` : URL du client (sert au CORS et aux liens dans les emails).
- `SMTP_*` / `MAIL_FROM` : configuration SMTP. **Si `SMTP_USER`/`SMTP_PASS` sont vides**, le serveur crée automatiquement un compte de test [Ethereal](https://ethereal.email/) au démarrage — aucun email réel n'est envoyé, et chaque envoi affiche dans la console un lien de prévisualisation (`[email] ... — preview: https://ethereal.email/message/...`). Pour utiliser un vrai compte SMTP (Gmail ou autre), renseigner ces variables.
- `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` : identifiants du compte Super Admin créé par le script de seed.
- `PUBLIC_API_URL` : URL publique de cette API, utilisée pour les liens d'image absolus dans les emails (ex. le logo de l'organisateur).
- `EMAIL_SETTINGS_ENCRYPTION_KEY` : clé AES-256-GCM (32 octets en base64) qui chiffre les mots de passe SMTP propres à chaque organisateur (voir "Email par organisateur" ci-dessous). Générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- `UPLOAD_MAX_MB` : taille maximale (en Mo) d'une image envoyée (logo, photo, fond de badge) avant optimisation.

`client/.env` :

- `VITE_API_URL` : URL de l'API (`http://localhost:4000/api` en développement).

## Lancer l'application

Depuis la racine, pour lancer le serveur et le client ensemble :

```bash
npm run dev
```

Ou séparément :

```bash
cd server && npm run dev     # http://localhost:4000
cd client && npm run dev     # http://localhost:5173
```

### Peupler la base de données

```bash
cd server
npm run seed:superadmin   # crée le compte Super Admin (lit SUPERADMIN_EMAIL/PASSWORD dans .env)
npm run seed:demo         # crée un organisateur, un gestionnaire, un événement, des catégories,
                           # 3 organismes invités, 10 participants et quelques scans de démonstration
```

Identifiants créés par `seed:demo` :

- Gestionnaire : `gestionnaire@amepa.example.com` / `Demo1234!`

Le script affiche aussi les liens d'inscription et de scan générés pour l'événement de démonstration.

## Se connecter au back-office

Ouvrir `http://localhost:5173/admin` et se connecter avec le compte Super Admin ou le compte gestionnaire de démonstration. Le Super Admin peut créer des organisateurs et des gestionnaires depuis les menus "Organisateurs" / "Gestionnaires" ; un sélecteur d'organisateur apparaît alors dans la barre supérieure pour choisir pour quel organisateur agir (un gestionnaire n'a pas ce sélecteur, son organisateur est fixé).

Cliquer sur un événement dans la liste "Événements" ouvre sa page de gestion avec les onglets Tableau de bord, Catégories, Organismes invités, Participants, et Liens (formulaire d'inscription + lien de scan).

## Tester le formulaire d'inscription et le scan sur un téléphone

Le formulaire public (`/inscription/:formToken`) fonctionne normalement en HTTP. **Le scan par caméra (`/scan/:scanToken`) exige HTTPS** dès qu'on sort de `localhost` — c'est une restriction des navigateurs, pas de l'application.

Pour tester sur un téléphone connecté au même réseau Wi-Fi que l'ordinateur :

```bash
cd client
npm run dev:https
```

Cela active un certificat auto-signé (`@vitejs/plugin-basic-ssl`) et Vite affiche une URL réseau du type `https://<IP-de-la-machine>:5173`. Ouvrir cette URL sur le téléphone, accepter l'avertissement de sécurité (certificat auto-signé, normal en développement), puis naviguer vers `/scan/<token>`.

Le serveur API doit rester accessible depuis le téléphone sur le même réseau : si besoin, mettre à jour `VITE_API_URL` dans `client/.env` avec l'IP de la machine plutôt que `localhost`, et `CLIENT_URL` dans `server/.env` avec l'URL HTTPS du client.

Alternative sans configuration réseau : un tunnel (ngrok ou équivalent) pointé sur le port du client.

## Structure du projet

```
/server
  /src
    /config        env, connexion MongoDB, mailer (Ethereal ou SMTP réel)
    /models        schémas Mongoose (Organisateur, User, Event, CategorieEvent,
                    InvitedOrganism, Participant, Scan, EmailLog, Image, EmailSettings)
    /middlewares   auth, rôles, tenantScope, eventScope, validation, erreurs, rate limit, upload
    /routes        routes Express, imbriquées par organisateur puis par événement
    /controllers
    /services      email (plateforme + par organisateur), chiffrement, QR code, badge PDF,
                    optimisation d'images, statistiques (agrégations MongoDB)
    /utils
    /scripts       seedSuperAdmin.js, seedDemo.js
/client
  /src
    /api           clients Axios par domaine
    /admin         app react-admin : dataProvider, authProvider, ressources CRUD
    /pages/public  formulaire d'inscription, page de scan
    /components, /layouts, /hooks
```

## Email par organisateur

Chaque organisateur peut configurer sa propre boîte email d'envoi (page "Paramètres email" dans le back-office) : hôte/port SMTP, utilisateur, mot de passe, nom et adresse d'expéditeur. Le mot de passe est chiffré en base (jamais en clair, jamais retourné par l'API) et un bouton "Tester la connexion" envoie un vrai email de test pour valider la configuration.

Si un organisateur n'a pas de configuration active, ou si son dernier test a échoué, les emails de confirmation et de badge de ses événements sont envoyés depuis l'adresse par défaut de la plateforme (`SMTP_*`/`MAIL_FROM` dans `.env`) — aucune inscription n'est bloquée par une configuration email manquante ou cassée. Le journal d'envoi (`EmailLog`) indique toujours lequel des deux expéditeurs a été utilisé.

## Images (logos, fond de badge, photo des participants)

Les images sont envoyées en `multipart/form-data`, vérifiées par leur contenu réel (pas par leur extension), optimisées (redimensionnement, suppression des métadonnées EXIF, encodage WebP) puis stockées dans une collection MongoDB dédiée — jamais en URL externe, jamais en base64 dans les autres documents.

- **Logo de l'organisateur** et **logo de l'organisme invité** : visibles sur les badges et dans les emails, modifiables depuis leur fiche respective dans le back-office.
- **Fond de badge** : image de fond par événement, avec un aperçu PDF du badge (page de l'événement, bouton "Aperçu du badge") avant impression.
- **Photo du participant** : ajoutée soit par le participant sur le formulaire d'inscription (upload ou prise de vue via l'appareil photo du téléphone), soit par le gestionnaire dans le back-office. Son usage est soumis à une case de consentement explicite côté formulaire public. L'événement peut rendre la photo obligatoire à l'inscription (paramètre "Photo obligatoire" dans la fiche événement).
- Le jour de l'événement, la page de scan affiche la photo du participant en grand à côté de son nom pour permettre une vérification visuelle d'identité ; en l'absence de photo, un message "Pas de photo, vérifier l'identité" s'affiche à la place.

Les photos de participants ne sont **jamais** accessibles par une URL publique : elles ne sont visibles que par les utilisateurs authentifiés du back-office (scopé par organisateur) ou via la page de scan pendant la fenêtre de validité du lien de scan de l'événement. Les logos et le fond de badge, eux, sont accessibles sans authentification (nécessaire pour s'afficher dans les emails et sur le formulaire public).

Une action "Supprimer toutes les photos" (page Participants d'un événement) permet d'effacer les photos de tous les participants après l'événement.

## Sécurité et isolation multi-tenant

Chaque route de back-office imbriquée sous `/api/admin/organisateurs/:organisateurId/...` passe par le middleware `tenantScope` : pour un Gestionnaire, l'`organisateurId` de son JWT est **toujours** utilisé, quel que soit l'identifiant présent dans l'URL — un gestionnaire ne peut donc jamais accéder aux données d'un autre organisateur, même en forgeant l'URL. Les sous-ressources d'un événement (catégories, organismes, participants) passent en plus par `eventScope`, qui vérifie que l'événement appartient bien à l'organisateur résolu.

## Déploiement (Vercel — phase de test)

Tout est hébergé sur un seul projet Vercel, sur un seul domaine : le front (build Vite statique, `client/dist`) et l'API Express en fonction serverless (`api/index.js`, appelée via la réécriture `/api/*` de `vercel.json`). Le cookie de session et les images fonctionnent donc comme avec le proxy de développement. HTTPS est fourni par Vercel : caméra du scan et installation de l'application (PWA) fonctionnent sans réglage.

### Mettre en ligne

1. Sur [vercel.com](https://vercel.com) : **Add New → Project**, importer le dépôt GitHub `gestion-d-evenement`. Laisser **Root Directory** à la racine et **Framework Preset** sur *Other* : `vercel.json` fournit l'installation, le build et le dossier de sortie.
2. **Settings → Environment Variables** (Production) :

   | Variable | Valeur |
   | --- | --- |
   | `MONGODB_URI` | chaîne de connexion Atlas (idéalement une base dédiée au test) |
   | `JWT_SECRET` | une longue valeur aléatoire, différente de celle du poste de dev |
   | `EMAIL_SETTINGS_ENCRYPTION_KEY` | la **même** que celle de la base utilisée (sinon les mots de passe SMTP enregistrés ne se déchiffrent plus) |
   | `CLIENT_URL` | `https://<projet>.vercel.app` |
   | `APP_TIMEZONE` | `Africa/Casablanca` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | facultatif (vides = Ethereal, aucun email réel) |

3. **MongoDB Atlas → Network Access** : autoriser `0.0.0.0/0` (les IP de Vercel changent) — uniquement pour la phase de test.
4. **Deploy**. Chaque `git push` sur `main` redéploie automatiquement.

### Limites propres à Vercel

- **Taille des requêtes : 4,5 Mo maximum** par appel à l'API. Les imports de modèles `.badge.json` et de designs PDF/images (prévus jusqu'à 20 Mo) doivent rester sous cette taille en ligne.
- **PDF des badges** : Chromium vient de `@sparticuz/chromium` (version 153, Puppeteer cible Chrome 156) — à vérifier en premier après le déploiement (Aperçu PDF d'un badge). Les polices système sont minimales : les textes peuvent s'afficher avec une police de secours.
- **Durée** : 60 s par requête (`maxDuration` dans `vercel.json`) — l'impression d'un très grand lot de badges peut dépasser.
- **Limitation des tentatives de connexion** : comptée par instance de fonction (mémoire), donc moins stricte qu'en local.
- **Système de fichiers éphémère** : rien n'est écrit sur disque (images en base, PDF et QR codes en mémoire).

## Limitations connues

- Seules les entrées sont scannées ; les sorties ne sont pas suivies. Le tableau de bord n'affiche donc jamais de "présents en ce moment" ni de "temps passé sur place", ces métriques n'étant pas calculables sans scan de sortie.
- Les avertissements `npm audit` concernant `exceljs` (ancienne version de `uuid`) et `react-admin` (ancienne version de `query-string`/`decode-uri-component`) sont des dépendances transitives sans correctif non cassant disponible à ce jour ; le risque a été évalué et accepté (classes de vulnérabilité déni de service, non exploitables dans l'usage qu'en fait ce projet).
