// ─── Composants ──────────────────────────────────────────────────────────────
export { MrzScannerNative } from './native/MrzScannerNative'
export { MrzScannerWeb }    from './web/MrzScannerWeb'

// ─── Hook bas niveau (pour usage custom) ─────────────────────────────────────
export { useScanner } from './shared/useScanner'

// ─── Client API (pour usage standalone) ──────────────────────────────────────
export { sendImageToApi, sendUriToApi } from './shared/api-client'

// ─── Types publics ────────────────────────────────────────────────────────────
export type {
  // Résultat
  MrzResult,
  MrzFields,
  DocumentType,
  ScanState,
  // Config API
  ApiConfig,
  ApiMode,
  SelfHostedConfig,
  CloudConfig,
  // Props composants
  MrzScannerNativeProps,
  MrzScannerWebProps,
  MrzScannerBaseProps,
} from './shared/types'
