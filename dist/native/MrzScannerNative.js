import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { mapMlkitResult } from '../shared/mrz-mapper';
// Import conditionnel expo-mlkit-ocr
let ExpoMlkitOcr = null;
try {
    ExpoMlkitOcr = require('expo-mlkit-ocr').default;
}
catch (_a) { }
// Import conditionnel Haptics
let Haptics = null;
try {
    Haptics = require('expo-haptics');
}
catch (_b) { }
const SCAN_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 12;
function getStatusLabel(state, attempts, hint) {
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
            return `Échec après ${attempts} tentatives`;
    }
}
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
export function MrzScannerNative({ onSuccess, onError, onClose, hint = 'Alignez la zone MRZ dans le cadre', frameColor = '#c8ff00', successColor = '#34d399', }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanState, setScanState] = useState('idle');
    const [attempts, setAttempts] = useState(0);
    const cameraRef = useRef(null);
    const intervalRef = useRef(null);
    const isAnalyzingRef = useRef(false);
    const isMountedRef = useRef(true);
    const attemptsRef = useRef(0);
    // Animation pulse du cadre
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const colorAnim = useRef(new Animated.Value(0)).current;
    const pulseLoopRef = useRef(null);
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            stopScan();
        };
    }, []);
    function startPulse() {
        pulseLoopRef.current = Animated.loop(Animated.sequence([
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
        pulseLoopRef.current.start();
    }
    function flashSuccess() {
        var _a;
        (_a = pulseLoopRef.current) === null || _a === void 0 ? void 0 : _a.stop();
        Animated.timing(colorAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }
    function stopScan() {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }
    const analyzeFrame = useCallback(async () => {
        var _a, _b;
        if (isAnalyzingRef.current || !cameraRef.current || !isMountedRef.current)
            return;
        isAnalyzingRef.current = true;
        try {
            // 1. Capture frame
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.9,
                skipProcessing: true,
            });
            if (!photo || !isMountedRef.current)
                return;
            // 2. Crop sur les 38% bas (zone MRZ)
            const cropped = await manipulateAsync(photo.uri, [
                {
                    crop: {
                        originX: 0,
                        originY: Math.floor(photo.height * 0.62),
                        width: photo.width,
                        height: Math.floor(photo.height * 0.38),
                    },
                },
            ], { compress: 0.9, format: SaveFormat.JPEG });
            if (!isMountedRef.current)
                return;
            if (isMountedRef.current)
                setScanState('analyzing');
            // 3. OCR local via expo-mlkit-ocr
            // recognizeText retourne { text: string, blocks: [...] }
            const ocrResult = await ExpoMlkitOcr.recognizeText(cropped.uri);
            // 4. Extraire le texte brut de tous les blocs
            const fullText = ocrResult
                .map((block) => { var _a, _b; return (_b = (_a = block.text) !== null && _a !== void 0 ? _a : block.value) !== null && _b !== void 0 ? _b : ''; })
                .join('\n');
            // 5. Parser la MRZ depuis le texte OCR
            const result = mapMlkitResult(fullText);
            if (!result || !isMountedRef.current) {
                // MRZ non détectée → retry
                attemptsRef.current += 1;
                setAttempts(attemptsRef.current);
                if (attemptsRef.current >= MAX_ATTEMPTS) {
                    stopScan();
                    setScanState('failed');
                    onError === null || onError === void 0 ? void 0 : onError(new Error(`MRZ non détectée après ${MAX_ATTEMPTS} tentatives.`));
                }
                else {
                    setScanState('scanning');
                }
                return;
            }
            // 6. Succès
            stopScan();
            setScanState('success');
            flashSuccess();
            (_a = Haptics === null || Haptics === void 0 ? void 0 : Haptics.notificationAsync) === null || _a === void 0 ? void 0 : _a.call(Haptics, (_b = Haptics === null || Haptics === void 0 ? void 0 : Haptics.NotificationFeedbackType) === null || _b === void 0 ? void 0 : _b.Success);
            setTimeout(() => {
                if (isMountedRef.current)
                    onSuccess(result);
            }, 500);
        }
        catch (err) {
            if (isMountedRef.current)
                setScanState('scanning');
        }
        finally {
            isAnalyzingRef.current = false;
        }
    }, [onSuccess, onError]);
    function startScan() {
        if (intervalRef.current)
            return;
        attemptsRef.current = 0;
        setAttempts(0);
        setScanState('scanning');
        startPulse();
        analyzeFrame();
        intervalRef.current = setInterval(analyzeFrame, SCAN_INTERVAL_MS);
    }
    function reset() {
        stopScan();
        attemptsRef.current = 0;
        setAttempts(0);
        colorAnim.setValue(0);
        pulseAnim.setValue(1);
        setScanState('idle');
    }
    if (!ExpoMlkitOcr) {
        return (_jsxs(View, { style: styles.errorContainer, children: [_jsx(Text, { style: styles.errorTitle, children: "\u26A0\uFE0F Peer dep manquant" }), _jsx(Text, { style: styles.errorText, children: "Installe expo-mlkit-ocr dans ton projet :" }), _jsx(Text, { style: styles.errorCode, children: "npx expo install expo-mlkit-ocr" }), onClose && (_jsx(Pressable, { style: styles.permBtn, onPress: onClose, children: _jsx(Text, { style: styles.permBtnText, children: "Fermer" }) }))] }));
    }
    // ── Permissions ─────────────────────────────────────────────────────────────
    if (!permission)
        return _jsx(View, { style: styles.container });
    if (!permission.granted) {
        return (_jsxs(View, { style: styles.permContainer, children: [_jsx(Text, { style: styles.permText, children: "Acc\u00E8s \u00E0 la cam\u00E9ra requis pour scanner le document." }), _jsx(Pressable, { style: styles.permBtn, onPress: requestPermission, children: _jsx(Text, { style: styles.permBtnText, children: "Autoriser la cam\u00E9ra" }) })] }));
    }
    const borderColor = colorAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [frameColor, successColor],
    });
    return (_jsxs(View, { style: styles.container, children: [_jsx(CameraView, { ref: cameraRef, style: StyleSheet.absoluteFill, facing: "back", onCameraReady: startScan }), _jsxs(View, { style: styles.overlay, pointerEvents: "none", children: [_jsx(View, { style: styles.topMask }), _jsxs(View, { style: styles.middleRow, children: [_jsx(View, { style: styles.sideMask }), _jsxs(Animated.View, { style: [
                                    styles.frame,
                                    {
                                        borderColor,
                                        transform: [{ scale: pulseAnim }],
                                    },
                                ], children: [scanState === 'analyzing' && (_jsx(ActivityIndicator, { size: "small", color: "rgba(255,255,255,0.8)", style: styles.spinner })), scanState === 'success' && (_jsx(Text, { style: [styles.successIcon, { color: successColor }], children: "\u2713" }))] }), _jsx(View, { style: styles.sideMask })] }), _jsx(View, { style: styles.bottomMask })] }), _jsx(View, { style: styles.statusBar, pointerEvents: "none", children: _jsx(Text, { style: styles.statusText, children: getStatusLabel(scanState, attempts, hint) }) }), scanState === 'failed' && (_jsx(View, { style: styles.retryRow, pointerEvents: "box-none", children: _jsx(Pressable, { style: styles.retryBtn, onPress: () => {
                        reset();
                        setTimeout(startScan, 100);
                    }, children: _jsx(Text, { style: styles.retryText, children: "R\u00E9essayer" }) }) })), onClose && (_jsx(Pressable, { style: styles.closeBtn, onPress: onClose, hitSlop: 12, children: _jsx(Text, { style: styles.closeTxt, children: "\u2715" }) }))] }));
}
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
    middleRow: { flexDirection: 'row', height: 100 },
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#080810',
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
        marginBottom: 12,
    },
    errorCode: {
        backgroundColor: '#13131f',
        color: '#c8ff00',
        fontSize: 12,
        padding: 12,
        borderRadius: 8,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: 24,
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
