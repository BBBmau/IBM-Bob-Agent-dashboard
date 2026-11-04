# IBM Bob Agent Dashboard

A configurable, read-only operations dashboard for autonomous agents that use
Firestore as their source of truth.

The included preset visualizes the list-resource agent, but the application is
not coupled to that worker. Collection names, document fields, lifecycle
statuses, branding, and source links are loaded at runtime from
[`public/dashboard.config.json`](public/dashboard.config.json).

## What it shows

- Queue totals and task status distribution
- Live agent heartbeats and current work
- Active task progress with human-readable step descriptions
- Canonical task search and filtering
- Pull request, commit, and CI metadata
- Human-review queue
- Per-task step timeline

The browser only reads Firestore. It has no write operations, and the included
security rules deny every write.

## Quick preview

```bash
npm install
cp .env.example .env.local
```

Node.js 24.12 or newer is required.

Set this explicit local-only value in `.env.local`:

```dotenv
VITE_DEMO_MODE=true
```

Then run:

```bash
npm run dev
```

Demo mode is never enabled automatically. A missing Firebase configuration
produces a setup screen rather than fake production data.

## Connect a Firebase project

1. Create or select a Firebase project that owns the Firestore database.
2. Register a Web application in Firebase.
3. Enable Google sign-in under **Authentication → Sign-in method**.
4. Add the deployment domain under **Authentication → Authorized domains**.
5. Copy `.env.example` to `.env.local`.
6. Fill the Firebase web application values and database ID.
7. Leave `VITE_DEMO_MODE=false`.

Example:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=example.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=example
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_ID=list-resources
VITE_DEMO_MODE=false
```

Firebase web configuration is not a service-account credential. It identifies
the project; Firestore Security Rules authorize data access.

## Configure another agent architecture

Edit [`public/dashboard.config.json`](public/dashboard.config.json). The file is
fetched when the page loads, so a deployment can change schemas and branding
without rebuilding the JavaScript bundle.

The important sections are:

```json
{
  "collections": {
    "tasks": "jobs",
    "agents": "workers",
    "steps": "events"
  },
  "fields": {
    "task": {
      "title": "service_name",
      "status": "lifecycle.status",
      "currentStepDescription": "progress.description"
    }
  },
  "statusGroups": {
    "active": ["leased", "working", "running"]
  }
}
```

Field mappings support nested paths such as `lifecycle.status`. Keep every field
key in the configuration; use an empty string when the source schema has no
equivalent.

Task step documents currently use these generic fields:

- `node`
- `description`
- `details`
- `status`
- `result`
- `error`
- `created_at`

If another architecture uses a different step schema, add a small adapter beside
[`src/adapter.ts`](src/adapter.ts).

## Security

The included [`firestore.rules`](firestore.rules) configuration:

- allows reads only for authenticated users;
- denies all browser writes;
- never grants access based only on the public Firebase configuration.

Before deploying, tighten access for your organization if required. For
example, use custom claims or an allowlist collection rather than accepting
every Google account.

The sample [`firebase.json`](firebase.json) targets the named
`list-resources` database. Change its `database` value when using another
database, then deploy rules:

```bash
firebase deploy --only firestore
```

## Deploy

Build the static application:

```bash
npm run build
```

Deploy to Firebase Hosting:

```bash
npm install --global firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only hosting
```

It can also be hosted by any static provider. Configure the provider's
environment variables at build time and serve `dist/`.

## Development

```bash
npm run lint
npm test
npm run typecheck
npm run build
```

The application uses React, TypeScript, Vite, the modular Firebase Web SDK, and
Lucide icons.
