import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, } from 'react-native';
import { useSdkLicence } from '../shared/licence';
/**
 * AppInitializer — OPTIONNEL.
 *
 * `<MrzScannerNative>` vérifie sa propre licence directement (comme une
 * <MapView apiKey="...">) — ce wrapper n'est donc plus la mécanique de
 * sécurité, juste une amélioration UX : il pré-valide la clé une fois au
 * démarrage et affiche un écran de blocage global, pour éviter qu'un
 * écran de scan s'affiche brièvement avant que sa propre validation
 * interne ne se résolve.
 *
 * Avec ou sans ce wrapper, `<MrzScannerNative sdkKey="...">` est toujours
 * protégé — le cache SecureStore partagé évite simplement un appel réseau
 * redondant si la clé a déjà été validée ici.
 */
export function AppInitializer({ sdkKey, apiUrl, appId, children, }) {
    const { licenceState, isLicenceValid, licenceError, revalidate } = useSdkLicence({
        sdkKey,
        apiUrl,
        appId,
    });
    if (licenceState === 'idle' || licenceState === 'validating') {
        return (_jsxs(View, { style: styles.center, children: [_jsx(ActivityIndicator, { size: "large", color: "#c8ff00" }), _jsx(Text, { style: styles.text, children: "Initialisation\u2026" })] }));
    }
    if (!isLicenceValid) {
        const isNetworkError = licenceState === 'error';
        return (_jsxs(View, { style: styles.center, children: [_jsx(Text, { style: styles.errorTitle, children: isNetworkError ? '📡 Connexion requise' : '🔑 Licence invalide' }), _jsx(Text, { style: styles.errorText, children: isNetworkError
                        ? 'Impossible de valider votre licence. Vérifiez votre connexion internet.'
                        : (licenceError !== null && licenceError !== void 0 ? licenceError : 'Clé SDK invalide. Renouvelez votre abonnement sur scanid.africa') }), isNetworkError && (_jsx(Pressable, { style: styles.retryBtn, onPress: revalidate, children: _jsx(Text, { style: styles.retryText, children: "R\u00E9essayer" }) }))] }));
    }
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
    retryBtn: {
        marginTop: 24,
        backgroundColor: '#c8ff00',
        borderRadius: 8,
        paddingHorizontal: 28,
        paddingVertical: 12,
    },
    retryText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 15,
    },
});
