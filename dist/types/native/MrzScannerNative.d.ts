import { type ReactElement } from 'react';
import type { MrzScannerNativeProps } from '../shared/types';
/**
 * MrzScannerNative
 *
 * Scan MRZ 100% LOCAL — aucun appel réseau, fonctionne hors ligne.
 *
 * Flow :
 *   expo-camera → takePictureAsync()
 *     → manipulateAsync() crop 38% bas (zone MRZ)
 *     → ExpoMlkitOcr.recognizeText() OCR local
 *     → mrz-mapper extrait + parse les lignes MRZ
 *     → onSuccess(MrzResult)
 *
 * Peer deps dans le projet consommateur :
 *   npx expo install expo-camera expo-image-manipulator expo-mlkit-ocr
 *   npx expo run:ios
 */
export declare function MrzScannerNative({ sdkKey, apiUrl, appId, onSuccess, onError, onClose, hint, frameColor, successColor, successSound, retryBtnBackgroundColor, }: MrzScannerNativeProps): ReactElement;
