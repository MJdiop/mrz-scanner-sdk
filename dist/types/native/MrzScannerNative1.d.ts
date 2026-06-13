import { type ReactElement } from 'react';
import type { MrzScannerNativeProps } from '../shared/types';
/**
 * MrzScannerNative
 *
 * Composant React Native (Expo) de scan MRZ automatique.
 * Démarre dès que la caméra est prête — aucun bouton requis.
 *
 * Usage:
 * ```tsx
 * <MrzScannerNative
 *   api={{ mode: 'selfhosted', apiUrl: 'http://192.168.1.10:3000' }}
 *   onSuccess={(result) => console.log(result.fields)}
 *   onClose={() => navigation.goBack()}
 * />
 * ```
 */
export declare function MrzScannerNative({ api, onSuccess, onError, onClose, maxAttempts, scanIntervalMs, hint, frameColor, successColor, }: MrzScannerNativeProps): ReactElement;
