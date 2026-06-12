import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';

import { useScanner } from '../shared/useScanner';
import { sendUriToApi } from '../shared/api-client';
import type {
  ApiConfig,
  MrzResult,
  MrzScannerNativeProps,
  ScanState,
} from '../shared/types';

// Tentative d'import haptics — optionnel
let Haptics: {
  notificationAsync: (t: unknown) => Promise<void>;
  NotificationFeedbackType: { Success: unknown };
} | null = null;
try {
  Haptics = require('expo-haptics');
} catch {}

// ─── Labels d'état ────────────────────────────────────────────────────────────

function getStatusLabel(
  state: ScanState,
  attempts: number,
  maxAttempts: number,
  hint: string,
): string {
  switch (state) {
    case 'idle':
      return 'Initialisation…';
    case 'scanning':
      return hint;
    case 'analyzing':
      return 'Lecture en cours…';
    case 'success':
      return '✓ Document reconnu !';
    case 'failed':
      return `Scan échoué après ${attempts}/${maxAttempts} tentatives`;
  }
}

// ─── Composant principal ──────────────────────────────────────────────────────

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
export function MrzScannerNative({
  api,
  onSuccess,
  onError,
  onClose,
  maxAttempts = 10,
  scanIntervalMs = 1500,
  hint = 'Alignez la zone MRZ dans le cadre',
  frameColor = '#FFFFFF',
  successColor = '#34d399',
}: MrzScannerNativeProps): ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [enableTorch, setEnableTorch] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.025,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.current.start();
  }

  function flashSuccess() {
    pulseLoop.current?.stop();
    Animated.timing(colorAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }

  // Capture + recadrage sur les 38% bas (zone MRZ)
  const captureFrame = useCallback(async () => {
    if (!cameraRef.current) return null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: true,
      });
      if (!photo) return null;

      const cropped = await manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: 0,
              originY: Math.floor(photo.height * 0.62),
              width: photo.width,
              height: Math.floor(photo.height * 0.38),
            },
          },
        ],
        { compress: 0.85, format: SaveFormat.JPEG },
      );
      return { uri: cropped.uri };
    } catch {
      return null;
    }
  }, []);

  const handleSuccess = useCallback(
    (result: MrzResult) => {
      flashSuccess();
      Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Petit délai pour laisser voir le feedback visuel avant de fermer
      setTimeout(() => onSuccess(result), 500);
    },
    [onSuccess],
  );

  const { scanState, attempts, start, reset } = useScanner({
    api,
    maxAttempts,
    scanIntervalMs,
    onSuccess: handleSuccess,
    onError,
    captureFrame,
    sendToApi: async (cfg: ApiConfig, payload: string | Blob) =>
      sendUriToApi(cfg, payload as string),
  });

  // Démarrer quand la caméra est prête
  function onCameraReady() {
    startPulse();
    start();
  }

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 2],
    outputRange: [frameColor, successColor],
  });

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permText}>
          Accès à la caméra requis pour scanner le document.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Autoriser la caméra</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Caméra plein écran */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        onCameraReady={onCameraReady}
        enableTorch={enableTorch}
      />

      {/* Masques sombres autour de la zone MRZ */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.topMask} />
        <View style={styles.middleRow}>
          <View style={styles.sideMask} />

          {/* Cadre MRZ animé */}
          <Animated.View
            style={[
              styles.frame,
              {
                borderColor,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {scanState === 'analyzing' && (
              <ActivityIndicator
                size="small"
                color="rgba(255,255,255,0.8)"
                style={styles.spinner}
              />
            )}
            {scanState === 'success' && (
              <Text style={[styles.successIcon, { color: successColor }]}>
                ✓
              </Text>
            )}
          </Animated.View>

          <View style={styles.sideMask} />
        </View>
        <View style={styles.bottomMask} />
      </View>

      {/* Statut */}
      <View style={styles.statusBar} pointerEvents="none">
        <Text style={styles.statusText}>
          {getStatusLabel(scanState, attempts, maxAttempts, hint)}
        </Text>
      </View>

      {/* Retry si échec */}
      {scanState === 'failed' && (
        <View style={styles.retryRow}>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              reset();
              setTimeout(start, 100);
            }}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {/* Fermer */}
      {onClose && (
        <>
          <Pressable
            style={[styles.closeBtn, { right: 100 }]}
            onPress={() => setEnableTorch(!enableTorch)}
            hitSlop={12}
          >
            <Text style={styles.closeTxt}>
              {enableTorch ? (
                <MaterialIcons name="flashlight-off" size={20} color="white" />
              ) : (
                <MaterialIcons name="flashlight-on" size={20} color="white" />
              )}
            </Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeTxt}>✕</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const FRAME_H = 100;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  permContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  permText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permBtn: {
    backgroundColor: '#c8ff00',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  permBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },

  overlay: { ...StyleSheet.absoluteFill },
  topMask: { flex: 3, backgroundColor: 'rgba(0,0,0,0.55)' },
  middleRow: { flexDirection: 'row', height: FRAME_H },
  sideMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  bottomMask: { flex: 2, backgroundColor: 'rgba(0,0,0,0.55)' },

  frame: {
    flex: 5,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: { position: 'absolute', top: 8, right: 8 },
  successIcon: { fontSize: 28, fontWeight: '700' },

  statusBar: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  retryRow: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#c8ff00',
    borderRadius: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryText: { color: '#000', fontWeight: '700', fontSize: 15 },

  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    right: 20,
    padding: 10,
  },
  closeTxt: { color: '#fff', fontSize: 22 },
});
