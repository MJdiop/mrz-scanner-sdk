export { MrzScannerNative } from './native/MrzScannerNative';
export { MrzScannerWeb } from './web/MrzScannerWeb';
export { useScanner } from './shared/useScanner';
export { sendImageToApi, sendUriToApi } from './shared/api-client';
export type { MrzResult, MrzFields, DocumentType, ScanState, ApiConfig, ApiMode, SelfHostedConfig, CloudConfig, MrzScannerNativeProps, MrzScannerWebProps, MrzScannerBaseProps, } from './shared/types';
