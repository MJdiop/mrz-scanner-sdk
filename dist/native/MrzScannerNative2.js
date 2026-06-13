import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { mapVisionCameraResult } from '../shared/mrz-mapper2';
// Import conditionnel — évite le crash si vision-camera-mrz-scanner
// n'est pas installé dans le projet consommateur
let MRZScanner = null;
let hasMrzScanner = false;
try {
    const mod = require('vision-camera-mrz-scanner');
    MRZScanner = mod.MRZScanner;
    hasMrzScanner = true;
}
catch (_a) {
    hasMrzScanner = false;
}
// Tentative d'import haptics — optionnel
let Haptics = null;
try {
    Haptics = require('expo-haptics');
}
catch (_b) { }
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
export function MrzScannerNative({ onSuccess, onError, onClose, hint = 'Alignez la zone MRZ dans le cadre', frameColor = '#c8ff00', successColor = '#34d399', enableMRZFeedBack = true, }) {
    // ── Erreur si peer dep manquant ─────────────────────────────────────────────
    if (!hasMrzScanner || !MRZScanner) {
        return (_jsxs(View, { style: styles.errorContainer, children: [_jsx(Text, { style: styles.errorTitle, children: "\u26A0\uFE0F Peer dep manquant" }), _jsx(Text, { style: styles.errorText, children: "Installe les d\u00E9pendances requises dans ton projet :" }), _jsx(Text, { style: styles.errorCode, children: "npx expo install react-native-vision-camera vision-camera-mrz-scanner" }), onClose && (_jsx(Pressable, { style: styles.closeBtn, onPress: onClose, children: _jsx(Text, { style: styles.closeBtnText, children: "Fermer" }) }))] }));
    }
    // ── Callback déclenché par vision-camera-mrz-scanner ─────────────────────
    const handleMrzResults = useCallback((rawResults) => {
        var _a, _b;
        try {
            // vision-camera-mrz-scanner appelle ce callback plusieurs fois
            // on vérifie qu'on a au moins un documentNumber valide
            if (!(rawResults === null || rawResults === void 0 ? void 0 : rawResults.documentNumber))
                return;
            const result = mapVisionCameraResult(rawResults);
            // Feedback haptique si disponible
            (_a = Haptics === null || Haptics === void 0 ? void 0 : Haptics.notificationAsync) === null || _a === void 0 ? void 0 : _a.call(Haptics, (_b = Haptics.NotificationFeedbackType) === null || _b === void 0 ? void 0 : _b.Success);
            onSuccess(result);
        }
        catch (err) {
            onError === null || onError === void 0 ? void 0 : onError(err instanceof Error ? err : new Error('Erreur de parsing MRZ'));
        }
    }, [onSuccess, onError]);
    // ── Rendu ──────────────────────────────────────────────────────────────────
    return (_jsxs(View, { style: styles.container, children: [_jsx(MRZScanner, { mrzFinalResults: handleMrzResults, enableMRZFeedBack: enableMRZFeedBack, enableBoundingBox: true, style: StyleSheet.absoluteFill }), _jsx(View, { style: styles.hintContainer, pointerEvents: "none", children: _jsx(Text, { style: styles.hintText, children: hint }) }), onClose && (_jsx(Pressable, { style: styles.closeIcon, onPress: onClose, hitSlop: 12, children: _jsx(Text, { style: styles.closeIconText, children: "\u2715" }) }))] }));
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
