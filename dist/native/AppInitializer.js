import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useSdkLicence } from '../shared/licence';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
export function AppInitializer({ sdkKey, apiUrl, appId, children, }) {
    const { licenceState, isLicenceValid, licenceError, revalidate } = useSdkLicence({
        sdkKey,
        apiUrl,
        appId,
    });
    // ── Validation en cours ──────────────────────────────────────────────────────
    if (licenceState === 'idle' || licenceState === 'validating') {
        return (_jsxs(View, { style: styles.center, children: [_jsx(ActivityIndicator, { size: "large", color: "#c8ff00" }), _jsx(Text, { style: styles.text, children: "Initialisation\u2026" })] }));
    }
    // ── Erreur réseau — app utilisable, scanner bloqué ───────────────────────────
    if (licenceState === 'error') {
        // On laisse quand même l'app démarrer — le scanner affichera
        // l'erreur uniquement quand l'utilisateur essaiera de scanner
        console.warn('[ScanID] Erreur réseau licence:', licenceError);
        return _jsx(_Fragment, { children: children });
    }
    // ── Licence invalide — clé expirée ou révoquée ───────────────────────────────
    if (!isLicenceValid && licenceState === 'invalid') {
        return (_jsxs(View, { style: styles.center, children: [_jsx(Text, { style: styles.errorTitle, children: "\uD83D\uDD11 Licence expir\u00E9e" }), _jsx(Text, { style: styles.errorText, children: licenceError !== null && licenceError !== void 0 ? licenceError : 'Clé SDK invalide. Renouvelez votre abonnement sur scanid.africa' })] }));
    }
    // ── Licence valide ───────────────────────────────────────────────────────────
    return _jsx(_Fragment, { children: children });
}
const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#080810',
        gap: 16,
        padding: 32,
    },
    text: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    errorTitle: {
        color: '#ff4d6d',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
});
