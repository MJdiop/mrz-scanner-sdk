# @scanid/mrz-scanner

Scanner MRZ automatique pour React Native (Expo) et React web, propulsé par [ScanID Africa](https://scanid.africa).

Scan automatique déclenché par frames — aucun bouton. Dès qu'une MRZ valide est détectée, `onSuccess` est appelé.

---

## Installation

```bash
# npm
npm install @scanid/mrz-scanner

# Expo (peer deps)
npx expo install expo-camera expo-image-manipulator expo-haptics
```

---

## Usage rapide

### React Native / Expo

```tsx
import { MrzScannerNative } from '@scanid/mrz-scanner'

<MrzScannerNative
  api={{ mode: 'selfhosted', apiUrl: 'http://192.168.1.10:3000' }}
  onSuccess={(result) => console.log(result.fields)}
  onClose={() => navigation.goBack()}
/>
```

### React web / Next.js

```tsx
// Next.js App Router — import dynamique obligatoire (SSR incompatible getUserMedia)
import dynamic from 'next/dynamic'

const MrzScannerWeb = dynamic(
  () => import('@scanid/mrz-scanner').then(m => m.MrzScannerWeb),
  { ssr: false }
)

<MrzScannerWeb
  api={{ mode: 'cloud', apiKey: 'sk_live_...', region: 'west-africa' }}
  onSuccess={(result) => console.log(result.fields)}
  width="100%"
  height="480px"
/>
```

---

## Configuration API

### Self-hosted (votre instance mrz-nest)

```ts
api={{ mode: 'selfhosted', apiUrl: 'https://your-api.com' }}
```

### ScanID Africa Cloud

```ts
api={{ mode: 'cloud', apiKey: 'sk_live_xxx', region: 'west-africa' }}
// regions: 'west-africa' | 'north-africa' | 'auto'
```

---

## Props

### Communes (native + web)

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `api` | `ApiConfig` | requis | Config API (self-hosted ou cloud) |
| `onSuccess` | `(result: MrzResult) => void` | requis | Appelé quand une MRZ est détectée |
| `onError` | `(error: Error) => void` | — | Appelé si maxAttempts est atteint |
| `onClose` | `() => void` | — | Bouton fermer |
| `maxAttempts` | `number` | `10` | Tentatives avant abandon |
| `scanIntervalMs` | `number` | `1500` | Intervalle entre deux captures (ms) |

### React Native uniquement

| Prop | Défaut | Description |
|---|---|---|
| `hint` | `"Alignez la zone MRZ dans le cadre"` | Texte sous le cadre |
| `frameColor` | `"#FFFFFF"` | Couleur du cadre |
| `successColor` | `"#34d399"` | Couleur du cadre en succès |

### React web uniquement

| Prop | Défaut | Description |
|---|---|---|
| `width` | `"100%"` | Largeur du composant |
| `height` | `"480px"` | Hauteur du composant |
| `className` | — | Classe CSS additionnelle |

---

## Type MrzResult

```ts
interface MrzResult {
  documentType: 'TD1' | 'TD2' | 'TD3' | 'DL'
  documentLabel: string        // "Passeport", "Carte d'identité nationale"…
  corrected: boolean           // true si mrz-fast a corrigé des erreurs OCR
  fields: {
    surname: string | null
    givenNames: string | null
    nationality: string | null
    issuingState: string | null
    dateOfBirth: string | null      // YYMMDD
    sex: 'male' | 'female' | 'unspecified' | null
    expirationDate: string | null   // YYMMDD
    documentNumber: string | null
    personalNumber: string | null
  }
}
```

---

## Architecture

```
src/
├── shared/
│   ├── types.ts         # Types TypeScript partagés
│   ├── api-client.ts    # Client fetch (self-hosted + cloud)
│   └── useScanner.ts    # Hook — boucle de scan automatique
├── native/
│   └── MrzScannerNative.tsx  # Composant Expo (expo-camera)
└── web/
    └── MrzScannerWeb.tsx     # Composant React web (getUserMedia)
```

Le hook `useScanner` est partagé entre les deux plateformes. La seule
différence est `captureFrame` (expo-camera vs canvas) et `sendToApi`
(URI vs Blob).

---

## Flux de scan automatique

```
onCameraReady
    ↓
setInterval(1500ms)
    ↓
captureFrame() → recadrage 38% bas (zone MRZ)
    ↓
sendToApi() → POST /mrz/scan
    ↓
✅ valid  → onSuccess() + stop scan
❌ invalid → attempts++ → retry | onError()
```

---

## Licence

MIT © ScanID Africa
