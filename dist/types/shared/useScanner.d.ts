import type { ApiConfig, MrzResult, ScanState } from './types';
interface UseScannerOptions {
    api?: ApiConfig;
    maxAttempts?: number;
    scanIntervalMs?: number;
    onSuccess: (result: MrzResult) => void;
    onError?: (error: Error) => void;
    /**
     * Fonction fournie par le composant (native ou web) qui :
     * 1. Capture une frame depuis la caméra
     * 2. La recadre sur la zone MRZ si besoin
     * 3. Retourne une URI (native) ou un Blob (web) prêt à envoyer
     * Retourne null si la capture échoue (caméra pas prête, etc.)
     */
    captureFrame: () => Promise<{
        uri: string;
    } | Blob | null>;
    /**
     * Fonction d'envoi adaptée à la plateforme
     * (sendUriToApi pour native, sendImageToApi pour web)
     */
    sendToApi: (api: ApiConfig, payload: string | Blob) => Promise<MrzResult>;
}
export interface ScannerControls {
    scanState: ScanState;
    attempts: number;
    start: () => void;
    stop: () => void;
    reset: () => void;
}
/**
 * Hook central du SDK.
 * Gère la boucle de scan automatique :
 *   captureFrame → sendToApi → onSuccess | retry | onError
 *
 * Utilisé à la fois par MrzScannerNative et MrzScannerWeb,
 * la seule différence étant captureFrame et sendToApi.
 */
export declare function useScanner({ api, maxAttempts, scanIntervalMs, onSuccess, onError, captureFrame, sendToApi, }: UseScannerOptions): ScannerControls;
export {};
