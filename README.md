# @scanid-africa/mrz-scanner

Scanner MRZ automatique pour React Native (Expo) et React web.
Détecte et parse les zones MRZ de passeports, cartes d'identité.

| Plateforme   | Mode          | Réseau requis |
| ------------ | ------------- | ------------- |
| React Native | 100% local    | ❌ hors ligne |
| React web    | Via API cloud | ✅ requis     |

---

## Installation

```bash
npm install @scanid-africa/mrz-scanner
 or
yarn add @scanid-africa/mrz-scanner
```

### Dépendances React Native

```bash
npx expo install expo-camera expo-image-manipulator expo-mlkit-ocr expo-audio expo-secure-store mrz-fast mrz
```

> ⚠️ **Dev build obligatoire** — ces modules natifs ne fonctionnent pas dans Expo Go.
>
> ```bash
> npx expo run:ios
> # ou
> npx expo run:android
> ```

### Dépendances React web

Aucune dépendance supplémentaire — `getUserMedia` est natif au navigateur.

---

## Démarrage rapide

### 1. Initialiser la licence au démarrage de l'app

`AppInitializer` valide votre clé SDK une fois au démarrage, stocke le token JWT 24h dans `expo-secure-store` et débloque le scanner. Aucun appel réseau n'est fait lors du scan.

```tsx
// app/_layout.tsx (Expo Router)
import { AppInitializer } from '@scanid-africa/mrz-scanner';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <AppInitializer
      sdkKey={process.env.EXPO_PUBLIC_SCANID_SDK_KEY!}
      apiUrl={process.env.EXPO_PUBLIC_SCANID_API_URL} // absent = cloud ScanID Africa
      appId="com.myapp.id"
    >
      <Stack />
    </AppInitializer>
  );
}
```

Variables d'environnement à ajouter dans `.env` :

```bash
EXPO_PUBLIC_SCANID_SDK_KEY=sdk_live_xxx
EXPO_PUBLIC_SCANID_API_URL=https://your-api.com  # optionnel — self-hosted uniquement
```

Obtenez votre clé SDK sur [scanid.africa](https://scanid.africa).

---

### 2. Scanner un document

```tsx
import { useState } from 'react';
import { Modal } from 'react-native';
import { MrzScannerNative, type MrzResult } from '@scanid-africa/mrz-scanner';

export function DocumentScanScreen() {
  const [showScanner, setShowScanner] = useState(false);

  function handleSuccess(result: MrzResult) {
    setShowScanner(false);
    console.log(result.fields.surname); // "DIOP"
    console.log(result.fields.givenNames); // "MBAYE JACQUES"
    console.log(result.fields.documentNumber); // "XXXXXXXXX"
    console.log(result.documentType); // "TD3_PASSPORT"
  }

  return (
    <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
      <MrzScannerNative
        onSuccess={handleSuccess}
        onError={(err) => console.error(err.message)}
        onClose={() => setShowScanner(false)}
      />
    </Modal>
  );
}
```

Le scan démarre automatiquement dès que la caméra est prête — aucun bouton requis.

---

## Usage React web

```tsx
import { MrzScannerWeb, type MrzResult } from '@scanid-africa/mrz-scanner';

export function ScanPage() {
  return (
    <MrzScannerWeb
      api={{ mode: 'cloud', apiKey: 'sk_live_...', region: 'west-africa' }}
      onSuccess={(result: MrzResult) => console.log(result.fields)}
      width="100%"
      height="480px"
    />
  );
}
```

### Next.js — import dynamique obligatoire

`getUserMedia` n'est pas disponible côté serveur. Utilisez `dynamic()` avec `ssr: false` :

```tsx
import dynamic from 'next/dynamic';

const MrzScannerWeb = dynamic(
  () => import('@scanid-africa/mrz-scanner').then((m) => m.MrzScannerWeb),
  { ssr: false },
);
```

---

## Props

### AppInitializer

| Prop       | Type              | Défaut | Description                                               |
| ---------- | ----------------- | ------ | --------------------------------------------------------- |
| `sdkKey`   | `string`          | requis | Clé SDK obtenue sur scanid.africa — format `sdk_live_xxx` |
| `apiUrl`   | `string`          | —      | URL self-hosted. Absent = cloud ScanID Africa             |
| `appId`    | `string`          | —      | Bundle ID iOS ou Package Name Android                     |
| `children` | `React.ReactNode` | requis | Contenu de l'app à protéger                               |

### MrzScannerNative

| Prop           | Type                          | Défaut                                | Description                                                                            |
| -------------- | ----------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `onSuccess`    | `(result: MrzResult) => void` | requis                                | Appelé dès qu'une MRZ valide est détectée                                              |
| `onError`      | `(error: Error) => void`      | —                                     | Appelé après `maxAttempts` échecs                                                      |
| `onClose`      | `() => void`                  | —                                     | Bouton ✕ pour fermer le scanner                                                        |
| `hint`         | `string`                      | `"Alignez la zone MRZ dans le cadre"` | Texte affiché sous le cadre                                                            |
| `frameColor`   | `string`                      | `"#c8ff00"`                           | Couleur du cadre de scan                                                               |
| `successColor` | `string`                      | `"#34d399"`                           | Couleur du cadre lors du succès                                                        |
| `successSound` | `boolean \| any`              | `true`                                | Son au succès — `true` (bundlé), `false` (désactivé), `require('./beep.mp3')` (custom) |

## Son de succès

Un bip est joué lors d'un scan réussi (bundlé dans le SDK, aucun fichier requis).

```tsx
// Son par défaut (bundlé)
<MrzScannerNative onSuccess={handleSuccess} />

// Son custom
<MrzScannerNative
  onSuccess={handleSuccess}
  successSound={require('./assets/sounds/beep.mp3')}
/>

// Son désactivé
<MrzScannerNative onSuccess={handleSuccess} successSound={false} />
```

Compatible `expo-audio` (nouveau) et `expo-av` (ancien) — détection automatique.

### MrzScannerWeb

| Prop             | Type                          | Défaut    | Description                               |
| ---------------- | ----------------------------- | --------- | ----------------------------------------- |
| `api`            | `ApiConfig`                   | requis    | Configuration de connexion à l'API        |
| `onSuccess`      | `(result: MrzResult) => void` | requis    | Appelé dès qu'une MRZ valide est détectée |
| `onError`        | `(error: Error) => void`      | —         | Appelé après `maxAttempts` échecs         |
| `onClose`        | `() => void`                  | —         | Bouton ✕ pour fermer le scanner           |
| `maxAttempts`    | `number`                      | `10`      | Nombre de tentatives avant abandon        |
| `scanIntervalMs` | `number`                      | `1500`    | Intervalle entre deux captures (ms)       |
| `width`          | `string \| number`            | `"100%"`  | Largeur du composant                      |
| `height`         | `string \| number`            | `"480px"` | Hauteur du composant                      |
| `className`      | `string`                      | —         | Classe CSS additionnelle                  |

---

## Configuration API (web)

### Self-hosted — votre propre instance

```ts
api={{ mode: 'selfhosted', apiUrl: 'https://your-api.com' }}
```

### Cloud ScanID Africa

```ts
api={{
  mode: 'cloud',
  apiKey: 'sk_live_...',
  region: 'west-africa' // 'west-africa' | 'north-africa' | 'auto'
}}
```

### React web — via API

```
getUserMedia → flux caméra
  ↓
canvas → capture frame + crop 50% bas
  ↓
fetch POST /mrz/scan (multipart/form-data)
  ↓
onSuccess(MrzResult)
```

---

## Type MrzResult

```ts
interface MrzResult {
  documentType: 'TD1_ID' | 'TD3_PASSPORT';
  documentLabel: string; // "Passeport" | "Carte d'identité " | …
  corrected: boolean; // true si une correction OCR a été appliquée
  fields: {
    surname: string | null;
    givenNames: string | null;
    nationality: string | null;
    issuingState: string | null;
    dateOfBirth: string | null; // YYMMDD
    sex: 'male' | 'female' | 'unspecified' | null;
    expirationDate: string | null; // YYMMDD
    documentNumber: string | null;
    personalNumber: string | null;
  };
}
```

### Documents supportés

| Type         | Document         | Lignes       | Parser                    |
| ------------ | ---------------- | ------------ | ------------------------- |
| TD3_PASSPORT | Passeport        | 2 × 44 chars | mrz-fast (correction OCR) |
| TD1_ID       | Carte d'identité | 3 × 30 chars | mrz                       |

---

## Licence

MIT © ScanID Africa — [scanid.africa](https://scanid.africa)

### Cycle de vie du token
