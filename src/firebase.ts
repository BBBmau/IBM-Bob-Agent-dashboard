import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore'

interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let services: FirebaseServices | null = null
let emulatorsConnected = false

function environmentValue(name: keyof ImportMetaEnv): string {
  return String(import.meta.env[name] ?? '').trim()
}

export function firebaseIsConfigured(): boolean {
  return Boolean(
    environmentValue('VITE_FIREBASE_API_KEY') &&
      environmentValue('VITE_FIREBASE_AUTH_DOMAIN') &&
      environmentValue('VITE_FIREBASE_PROJECT_ID') &&
      environmentValue('VITE_FIREBASE_APP_ID'),
  )
}

export function getFirebaseServices(): FirebaseServices {
  if (services) {
    return services
  }
  if (!firebaseIsConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env.local and set the VITE_FIREBASE_* values.',
    )
  }

  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: environmentValue('VITE_FIREBASE_API_KEY'),
      authDomain: environmentValue('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: environmentValue('VITE_FIREBASE_PROJECT_ID'),
      appId: environmentValue('VITE_FIREBASE_APP_ID'),
    })
  const databaseId = environmentValue('VITE_FIREBASE_DATABASE_ID') || '(default)'
  let db: Firestore
  try {
    db = initializeFirestore(app, {}, databaseId)
  } catch {
    db = getFirestore(app, databaseId)
  }
  const auth = getAuth(app)

  const emulatorHost = environmentValue('VITE_FIRESTORE_EMULATOR_HOST')
  if (emulatorHost && !emulatorsConnected) {
    const [host, rawPort] = emulatorHost.split(':')
    const port = Number(rawPort || 8080)
    if (!host || !Number.isInteger(port)) {
      throw new Error('VITE_FIRESTORE_EMULATOR_HOST must use host:port format')
    }
    connectFirestoreEmulator(db, host, port)
    const authHost = environmentValue('VITE_AUTH_EMULATOR_HOST')
    if (authHost) {
      connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true })
    }
    emulatorsConnected = true
  }

  services = { app, auth, db }
  return services
}

export function observeUser(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseServices().auth, callback)
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  await signInWithPopup(getFirebaseServices().auth, provider)
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseServices().auth)
}
