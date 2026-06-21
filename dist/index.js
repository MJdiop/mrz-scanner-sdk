// ─── Composants ──────────────────────────────────────────────────────────────
export { MrzScannerNative } from './native/MrzScannerNative';
export { MrzScannerWeb } from './web/MrzScannerWeb';
export { AppInitializer } from './native/AppInitializer';
// ─── Hooks (usage avancé) ─────────────────────────────────────────────────────
export { useSdkLicence } from './shared/licence';
// ─── Utilitaires ──────────────────────────────────────────────────────────────
export { mapMlkitResult } from './shared/mrz-mapper';
// ─── Hook bas niveau (pour usage custom) ─────────────────────────────────────
export { useScanner } from './shared/useScanner';
// ─── Client API (pour usage standalone) ──────────────────────────────────────
export { sendImageToApi, sendUriToApi } from './shared/api-client';
