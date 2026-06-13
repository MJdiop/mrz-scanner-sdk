import { type ReactElement } from 'react';
import type { MrzScannerNativeProps } from '../shared/types';
/**
 * MrzScannerNative
 *
 * Scan MRZ 100% LOCAL via vision-camera-mrz-scanner + MLKit.
 * Aucun appel réseau — fonctionne hors ligne.
 * Compatible Expo dev build (pas Expo Go).
 *
 * Peer deps requis dans le projet consommateur :
 *   npx expo install react-native-vision-camera vision-camera-mrz-scanner
 *
 * Usage:
 * ```tsx
 * <MrzScannerNative
 *   onSuccess={(result) => console.log(result.fields)}
 *   onClose={() => navigation.goBack()}
 * />
 * ```
 */
export declare function MrzScannerNative({ onSuccess, onError, onClose, hint, frameColor, successColor, enableMRZFeedBack, }: MrzScannerNativeProps): ReactElement;
