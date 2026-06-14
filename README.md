# @scanid-africa/mrz-scanner

Scanner MRZ automatique pour React Native (Expo) et React web. Détecte et parse les zones MRZ de passeports, cartes d'identité, visas et permis de conduire.

| Plateforme   | Mode          | Réseau requis |
| ------------ | ------------- | ------------- |
| React Native | 100% local    | ❌ hors ligne |
| React web    | Via API cloud | ✅ requis     |

---

## Installation

```bash
npm install @scanid-africa/mrz-scanner
```

### Dépendances React Native

```bash
npx expo install expo-camera expo-image-manipulator expo-mlkit-ocr expo-audio mrz-fast mrz
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

## Usage React Native

Le scanner s'ouvre dans un `Modal` plein écran. Le scan démarre automatiquement dès que la caméra est prête — aucun bouton requis.

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

`getUserMedia` n'est pas disponible côté serveur. Utilise `dynamic()` avec `ssr: false` :

```tsx
import dynamic from 'next/dynamic';

const MrzScannerWeb = dynamic(
  () => import('@scanid-africa/mrz-scanner').then((m) => m.MrzScannerWeb),
  { ssr: false },
);
```

---

## Props

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

---

## Son de succès

Par défaut, un bip est joué lors d'un scan réussi (bundlé dans le SDK, aucun fichier requis).

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

---

## Type MrzResult

```ts
interface MrzResult {
  documentType: 'TD1_ID' | 'TD2' | 'TD3_PASSPORT' | 'DL';
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

| Type         | Document               | Lignes       | Parser                    |
| ------------ | ---------------------- | ------------ | ------------------------- |
| TD3_PASSPORT | Passeport              | 2 × 44 chars | mrz-fast (correction OCR) |
| TD1_ID       | Carte d'identité       | 3 × 30 chars | mrz                       |
| TD2          | Visa / titre de voyage | 2 × 36 chars | mrz                       |
| DL           | Permis de conduire     | variable     | heuristique               |

---

## Flow technique

### React Native — 100% local

```
expo-camera → takePictureAsync()
  ↓
expo-image-manipulator → crop 38% bas (zone MRZ)
  ↓
expo-mlkit-ocr → OCR local (Apple Vision / Google MLKit)
  ↓
mrz-mapper → extrait les lignes MRZ depuis les blocs OCR
  ↓
mrz-fast / mrz → parse + validation des checksums ICAO
  ↓
onSuccess(MrzResult)
```

Le crop sur les 50% bas de l'image réduit le bruit OCR et accélère la détection. La gestion des blocs OCR individuels (en plus du texte global) permet de gérer les images en mode paysage sur Android.

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

## Configuration metro.config (si usage en local)

Si tu testes le SDK en local avec `file:../mrz-scanner-sdk`, ajoute dans `metro.config.cjs` :

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const sdkPath = path.resolve(__dirname, '../mrz-scanner-sdk');
const config = getDefaultConfig(__dirname);

config.watchFolders = [sdkPath];

config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  'expo-camera': path.resolve(__dirname, 'node_modules/expo-camera'),
  'expo-mlkit-ocr': path.resolve(__dirname, 'node_modules/expo-mlkit-ocr'),
  'expo-image-manipulator': path.resolve(
    __dirname,
    'node_modules/expo-image-manipulator',
  ),
  'expo-haptics': path.resolve(__dirname, 'node_modules/expo-haptics'),
  'expo-audio': path.resolve(__dirname, 'node_modules/expo-audio'),
};

config.resolver.unstable_enableSymlinks = true;
module.exports = config;
```

> Utilise l'extension `.cjs` si ton projet a `"type": "module"` dans `package.json`.

---

## Structure du package

````
src/
├── assets/
│   └── successSound.ts          # Bip WAV encodé en base64
├── shared/
│   ├── types.ts                 # Types TypeScript publics
│   ├── api-client.ts            # Client fetch (self-hosted + cloud)
│   ├── mrz-mapper.ts            # OCR text → MrzResult (gestion Android rotated)
│   ├── useScanner.ts            # Hook boucle de scan automatique (web)
│   └── useSuccessSound.ts       # Hook son de succès (expo-audio / expo-av)
├── native/
│   └── MrzScannerNative.tsx     # Composant React Native
└── web/
    └── MrzScannerWeb.tsx        # Composant React web
```                               |

---

## Licence

MIT © ScanID Africa
````
