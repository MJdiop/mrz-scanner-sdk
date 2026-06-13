import { type ReactElement } from 'react';
import type { MrzScannerNativeProps } from '../shared/types';
/**
 * MrzScannerNative
 *
 * Scan MRZ 100% LOCAL :
 *   expo-camera → capture frame → expo-image-manipulator (crop) →
 *   MLKit OCR (@infinitered/react-native-mlkit-ocr) →
 *   mrz-mapper (extract lignes MRZ) → mrz-fast (parse + validate) →
 *   onSuccess(MrzResult)
 *
 * Aucun appel réseau — fonctionne hors ligne.
 * Pas de babel.config.js requis.
 *
 * Peer deps :
 *   npx expo install expo-camera expo-image-manipulator @infinitered/react-native-mlkit-ocr
 *   npx expo run:ios
 */
export declare function MrzScannerNative({ onSuccess, onError, onClose, hint, frameColor, successColor, }: MrzScannerNativeProps): ReactElement;
