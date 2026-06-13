import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiConfig, MrzResult, ScanState } from './types';

const DEFAULT_INTERVAL = 1500;
const DEFAULT_MAX_ATTEMPTS = 10;

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
  captureFrame: () => Promise<{ uri: string } | Blob | null>;
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
export function useScanner({
  api,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  scanIntervalMs = DEFAULT_INTERVAL,
  onSuccess,
  onError,
  captureFrame,
  sendToApi,
}: UseScannerOptions): ScannerControls {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [attempts, setAttempts] = useState(0);

  // Refs pour éviter les closures obsolètes dans setInterval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAnalyzingRef = useRef(false); // verrou — évite les appels concurrents
  const isMountedRef = useRef(true);
  const attemptsRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopInterval();
    };
  }, []);

  function stopInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const analyze = useCallback(async () => {
    // Verrou : on ne lance pas un nouvel appel si le précédent tourne encore
    if (isAnalyzingRef.current || !isMountedRef.current) return;
    isAnalyzingRef.current = true;

    try {
      const frame = await captureFrame();
      if (!frame || !isMountedRef.current) return;

      if (isMountedRef.current) setScanState('analyzing');

      // frame est soit { uri: string } (native) soit un Blob (web)
      const payload = 'uri' in frame ? frame.uri : frame;
      const result = await sendToApi(api!, payload);

      if (!isMountedRef.current) return;

      // ✅ Succès
      stopInterval();
      setScanState('success');
      onSuccess(result);
    } catch {
      if (!isMountedRef.current) return;

      // Retry ou abandon
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);

      if (attemptsRef.current >= maxAttempts) {
        stopInterval();
        setScanState('failed');
        onError?.(new Error(`Scan échoué après ${maxAttempts} tentatives.`));
      } else {
        setScanState('scanning');
      }
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [api, captureFrame, sendToApi, onSuccess, onError, maxAttempts]);

  function start() {
    if (intervalRef.current) return;
    attemptsRef.current = 0;
    setAttempts(0);
    setScanState('scanning');
    // Première tentative immédiate puis intervalle
    analyze();
    intervalRef.current = setInterval(analyze, scanIntervalMs);
  }

  function stop() {
    stopInterval();
    setScanState('idle');
  }

  function reset() {
    stopInterval();
    isAnalyzingRef.current = false;
    attemptsRef.current = 0;
    setAttempts(0);
    setScanState('idle');
  }

  return { scanState, attempts, start, stop, reset };
}
