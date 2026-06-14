var _a;
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { mapMlkitResult } from '../shared/mrz-mapper';
import { MaterialIcons } from '@expo/vector-icons';
import { useSuccessSound } from '../shared/useSuccessSound';
let ExpoMlkitOcr = null;
// Après — fallback sur le module entier
const mlkit = require('expo-mlkit-ocr');
ExpoMlkitOcr = (_a = mlkit.default) !== null && _a !== void 0 ? _a : mlkit; // → { recognizeText, isSupported }
// Import conditionnel Haptics
let Haptics = null;
try {
    Haptics = require('expo-haptics');
}
catch (_b) { }
const SCAN_INTERVAL_MS = 1500;
const MAX_ATTEMPTS = 6;
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
export function MrzScannerNative({ onSuccess, onError, onClose, hint = 'Alignez la zone MRZ dans le cadre', frameColor = '#c8ff00', successColor = '#34d399', successSound = true, }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanState, setScanState] = useState('idle');
    const [attempts, setAttempts] = useState(0);
    const { play: playSuccessSound } = useSuccessSound(successSound);
    const cameraRef = useRef(null);
    const intervalRef = useRef(null);
    const isAnalyzingRef = useRef(false);
    const isMountedRef = useRef(true);
    const attemptsRef = useRef(0);
    // Animation pulse du cadre
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const colorAnim = useRef(new Animated.Value(0)).current;
    const pulseLoopRef = useRef(null);
    const [enableTorch, setEnableTorch] = useState(false);
    // const { playSound } = usePlaySound();
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
                shutterSound: false,
            });
            if (!photo || !isMountedRef.current)
                return;
            // TEST 2 : crop bas 50% (plus large que 38%)
            const cropped = await manipulateAsync(photo.uri, [
                {
                    crop: {
                        originX: 0,
                        originY: Math.floor(photo.height * 0.5),
                        width: photo.width,
                        height: Math.floor(photo.height * 0.5),
                    },
                },
            ], { compress: 0.9, format: SaveFormat.JPEG });
            if (!isMountedRef.current)
                return;
            if (isMountedRef.current)
                setScanState('analyzing');
            // 3. OCR local via expo-mlkit-ocr
            const ocrResult = await ExpoMlkitOcr.recognizeText(cropped.uri);
            // 4 Correct — extraire text + blocks séparément
            let fullText = '';
            let blocks;
            if (typeof ocrResult === 'string') {
                fullText = ocrResult;
            }
            else if ((ocrResult === null || ocrResult === void 0 ? void 0 : ocrResult.text) !== undefined) {
                fullText = ocrResult.text; // texte global
                blocks = ocrResult.blocks; // blocs individuels ← crucial pour Android
            }
            else if (Array.isArray(ocrResult)) {
                fullText = ocrResult.map((b) => { var _a; return (_a = b.text) !== null && _a !== void 0 ? _a : ''; }).join('\n');
                blocks = ocrResult;
            }
            // 5. Parser la MRZ depuis le texte OCR
            // const result: MrzResult | null = mapMlkitResult(fullText);
            // ✅ Correct
            const result = mapMlkitResult(fullText, blocks);
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
            playSuccessSound();
            flashSuccess();
            (_a = Haptics === null || Haptics === void 0 ? void 0 : Haptics.notificationAsync) === null || _a === void 0 ? void 0 : _a.call(Haptics, (_b = Haptics === null || Haptics === void 0 ? void 0 : Haptics.NotificationFeedbackType) === null || _b === void 0 ? void 0 : _b.Success);
            setTimeout(() => {
                if (isMountedRef.current)
                    onSuccess(result);
            }, 1000);
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
    return (_jsxs(View, { style: styles.container, children: [_jsx(CameraView, { ref: cameraRef, style: StyleSheet.absoluteFill, facing: "back", onCameraReady: startScan, enableTorch: enableTorch }), _jsxs(View, { style: styles.overlay, pointerEvents: "none", children: [_jsx(View, { style: styles.topMask }), _jsxs(View, { style: styles.middleRow, children: [_jsx(View, { style: styles.sideMask }), _jsxs(Animated.View, { style: [styles.frame], children: [_jsxs(View, { style: styles.mrzPreview, children: [_jsx(Text, { style: styles.mrzText, children: 'P<SEN<<<<<<<<<<<<<<<<<<<<NAME<<<<<<<<' }), _jsx(Text, { style: styles.mrzText, children: '0000000000SEN000000M00000000000000000' }), _jsx(Text, { style: styles.mrzText, children: 'P<SEN<<<<<<<<<<<<<<<<<<<<NAME<<<<<<<<' })] }), scanState === 'analyzing' && (_jsx(ActivityIndicator, { size: "small", color: "rgba(255,255,255,0.8)", style: styles.spinner })), scanState === 'success' && (_jsx(Text, { style: [styles.successIcon, { color: successColor }], children: "\u2713" }))] }), _jsx(View, { style: styles.sideMask })] }), _jsx(View, { style: styles.bottomMask })] }), _jsx(View, { style: styles.statusBar, pointerEvents: "none", children: _jsx(Text, { style: styles.statusText, children: getStatusLabel(scanState, attempts, hint) }) }), scanState === 'failed' && (_jsx(View, { style: styles.retryRow, pointerEvents: "box-none", children: _jsx(Pressable, { style: styles.retryBtn, onPress: () => {
                        reset();
                        setTimeout(startScan, 1000);
                    }, children: _jsx(Text, { style: styles.retryText, children: "R\u00E9essayer" }) }) })), onClose && (_jsxs(_Fragment, { children: [_jsx(Pressable, { style: [styles.closeBtn, { left: 20, top: 55 }], onPress: () => setEnableTorch(!enableTorch), hitSlop: 12, children: _jsx(Text, { style: styles.closeTxt, children: enableTorch ? (_jsx(MaterialIcons, { name: "flashlight-off", size: 22, color: "white" })) : (_jsx(MaterialIcons, { name: "flashlight-on", size: 22, color: "white" })) }) }), _jsx(Pressable, { style: styles.closeBtn, onPress: onClose, hitSlop: 12, children: _jsx(Text, { style: styles.closeTxt, children: "\u2715" }) })] }))] }));
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
    middleRow: { flexDirection: 'row', height: 250 },
    sideMask: { flex: 0.2, backgroundColor: 'rgba(0,0,0,0.55)' },
    bottomMask: { flex: 2, backgroundColor: 'rgba(0,0,0,0.55)' },
    frame: {
        flex: 5,
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
        top: 50,
        right: 20,
        padding: 10,
    },
    closeTxt: { color: '#fff', fontSize: 22 },
    mrzPreview: {
        position: 'absolute',
        bottom: 8,
        left: 6,
        right: 6,
        height: 70,
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        padding: 4,
        gap: 2,
    },
    mrzText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 1,
    },
});
