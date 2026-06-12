import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useScanner } from '../shared/useScanner';
import { sendUriToApi } from '../shared/api-client';
// Tentative d'import haptics — optionnel
let Haptics = null;
try {
    Haptics = require('expo-haptics');
}
catch (_a) { }
// ─── Labels d'état ────────────────────────────────────────────────────────────
function getStatusLabel(state, attempts, maxAttempts, hint) {
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
export function MrzScannerNative({ api, onSuccess, onError, onClose, maxAttempts = 10, scanIntervalMs = 1500, hint = 'Alignez la zone MRZ dans le cadre', frameColor = '#FFFFFF', successColor = '#34d399', }) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const colorAnim = useRef(new Animated.Value(0)).current;
    const pulseLoop = useRef(null);
    function startPulse() {
        pulseLoop.current = Animated.loop(Animated.sequence([
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
        ]));
        pulseLoop.current.start();
    }
    function flashSuccess() {
        var _a;
        (_a = pulseLoop.current) === null || _a === void 0 ? void 0 : _a.stop();
        Animated.timing(colorAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }
    // Capture + recadrage sur les 38% bas (zone MRZ)
    const captureFrame = useCallback(async () => {
        if (!cameraRef.current)
            return null;
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.85,
                skipProcessing: true,
            });
            if (!photo)
                return null;
            const cropped = await manipulateAsync(photo.uri, [
                {
                    crop: {
                        originX: 0,
                        originY: Math.floor(photo.height * 0.62),
                        width: photo.width,
                        height: Math.floor(photo.height * 0.38),
                    },
                },
            ], { compress: 0.85, format: SaveFormat.JPEG });
            return { uri: cropped.uri };
        }
        catch (_a) {
            return null;
        }
    }, []);
    const handleSuccess = useCallback((result) => {
        flashSuccess();
        Haptics === null || Haptics === void 0 ? void 0 : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Petit délai pour laisser voir le feedback visuel avant de fermer
        setTimeout(() => onSuccess(result), 500);
    }, [onSuccess]);
    const { scanState, attempts, start, reset } = useScanner({
        api,
        maxAttempts,
        scanIntervalMs,
        onSuccess: handleSuccess,
        onError,
        captureFrame,
        sendToApi: async (cfg, payload) => sendUriToApi(cfg, payload),
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
    if (!permission)
        return _jsx(View, { style: styles.container });
    if (!permission.granted) {
        return (_jsxs(View, { style: styles.permContainer, children: [_jsx(Text, { style: styles.permText, children: "Acc\u00E8s \u00E0 la cam\u00E9ra requis pour scanner le document." }), _jsx(Pressable, { style: styles.permBtn, onPress: requestPermission, children: _jsx(Text, { style: styles.permBtnText, children: "Autoriser la cam\u00E9ra" }) })] }));
    }
    return (_jsxs(View, { style: styles.container, children: [_jsx(CameraView, { ref: cameraRef, style: StyleSheet.absoluteFill, facing: "back", onCameraReady: onCameraReady, enableTorch: true }), _jsxs(View, { style: styles.overlay, pointerEvents: "none", children: [_jsx(View, { style: styles.topMask }), _jsxs(View, { style: styles.middleRow, children: [_jsx(View, { style: styles.sideMask }), _jsxs(Animated.View, { style: [
                                    styles.frame,
                                    {
                                        borderColor,
                                        transform: [{ scale: pulseAnim }],
                                    },
                                ], children: [scanState === 'analyzing' && (_jsx(ActivityIndicator, { size: "small", color: "rgba(255,255,255,0.8)", style: styles.spinner })), scanState === 'success' && (_jsx(Text, { style: [styles.successIcon, { color: successColor }], children: "\u2713" }))] }), _jsx(View, { style: styles.sideMask })] }), _jsx(View, { style: styles.bottomMask })] }), _jsx(View, { style: styles.statusBar, pointerEvents: "none", children: _jsx(Text, { style: styles.statusText, children: getStatusLabel(scanState, attempts, maxAttempts, hint) }) }), scanState === 'failed' && (_jsx(View, { style: styles.retryRow, children: _jsx(Pressable, { style: styles.retryBtn, onPress: () => {
                        reset();
                        setTimeout(start, 100);
                    }, children: _jsx(Text, { style: styles.retryText, children: "R\u00E9essayer" }) }) })), onClose && (_jsx(Pressable, { style: styles.closeBtn, onPress: onClose, hitSlop: 12, children: _jsx(Text, { style: styles.closeTxt, children: "\u2715" }) }))] }));
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
    overlay: Object.assign({}, StyleSheet.absoluteFill),
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
