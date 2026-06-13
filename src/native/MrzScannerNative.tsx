import React, { useCallback, type ReactElement } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MrzScannerNativeProps } from '../shared/types';
import { mapVisionCameraResult } from '../shared/mrz-mapper';

// Import conditionnel — évite le crash si vision-camera-mrz-scanner
// n'est pas installé dans le projet consommateur
let MRZScanner: any = null;
let hasMrzScanner = false;

try {
  const mod = require('vision-camera-mrz-scanner');
  MRZScanner = mod.MRZScanner;
  hasMrzScanner = true;
} catch {
  hasMrzScanner = false;
}

// Tentative d'import haptics — optionnel
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {}

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
export function MrzScannerNative({
  onSuccess,
  onError,
  onClose,
  hint = 'Alignez la zone MRZ dans le cadre',
  frameColor = '#c8ff00',
  successColor = '#34d399',
  enableMRZFeedBack = true,
}: MrzScannerNativeProps): ReactElement {
  // ── Erreur si peer dep manquant ─────────────────────────────────────────────
  if (!hasMrzScanner || !MRZScanner) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Peer dep manquant</Text>
        <Text style={styles.errorText}>
          Installe les dépendances requises dans ton projet :
        </Text>
        <Text style={styles.errorCode}>
          npx expo install react-native-vision-camera vision-camera-mrz-scanner
        </Text>
        {onClose && (
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Fermer</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ── Callback déclenché par vision-camera-mrz-scanner ─────────────────────
  const handleMrzResults = useCallback(
    (rawResults: Record<string, string>) => {
      try {
        // vision-camera-mrz-scanner appelle ce callback plusieurs fois
        // on vérifie qu'on a au moins un documentNumber valide
        if (!rawResults?.documentNumber) return;

        const result = mapVisionCameraResult(rawResults);

        // Feedback haptique si disponible
        Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType?.Success);

        onSuccess(result);
      } catch (err) {
        onError?.(
          err instanceof Error ? err : new Error('Erreur de parsing MRZ'),
        );
      }
    },
    [onSuccess, onError],
  );

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* vision-camera-mrz-scanner gère tout :
          caméra, frame processor MLKit, overlay de détection */}
      <MRZScanner
        mrzFinalResults={handleMrzResults}
        enableMRZFeedBack={enableMRZFeedBack}
        enableBoundingBox={true}
        style={StyleSheet.absoluteFill}
      />

      {/* Hint */}
      <View style={styles.hintContainer} pointerEvents="none">
        <Text style={styles.hintText}>{hint}</Text>
      </View>

      {/* Bouton fermer */}
      {onClose && (
        <Pressable style={styles.closeIcon} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeIconText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  hintContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  hintText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  closeIcon: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
  },
  closeIconText: {
    color: '#fff',
    fontSize: 18,
  },

  // Erreur peer dep manquant
  errorContainer: {
    flex: 1,
    backgroundColor: '#080810',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    color: '#ff4d6d',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorText: {
    color: '#f0ede6',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorCode: {
    backgroundColor: '#13131f',
    color: '#c8ff00',
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeBtn: {
    backgroundColor: '#c8ff00',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
