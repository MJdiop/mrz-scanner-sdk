// ─── Composants ──────────────────────────────────────────────────────────────
export { MrzScannerNative } from './native/MrzScannerNative';
export { MrzScannerWeb } from './web/MrzScannerWeb';

// ─── Hooks (usage avancé) ─────────────────────────────────────────────────────
export { useSdkLicence } from './shared/licence';

// ─── Utilitaires ──────────────────────────────────────────────────────────────
export { mapMlkitResult } from './shared/mrz-mapper';

// ─── Hook bas niveau (pour usage custom) ─────────────────────────────────────
export { useScanner } from './shared/useScanner';

// ─── Client API (pour usage standalone) ──────────────────────────────────────
export { sendImageToApi, sendUriToApi } from './shared/api-client';

export type {
  MrzResult,
  MrzFields,
  DocumentType,
  ScanState,
  ApiConfig,
  ApiMode,
  SelfHostedConfig,
  CloudConfig,
  MrzScannerNativeProps,
  MrzScannerWebProps,
  MrzScannerBaseProps,
  SdkLicenceConfig,
} from './shared/types';

export type { LicenceState, LicenceStatus } from './shared/licence';
