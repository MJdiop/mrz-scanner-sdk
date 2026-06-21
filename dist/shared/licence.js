import { useCallback, useEffect, useRef, useState } from 'react';
// const CLOUD_BASE_URL = 'https://api.scanid.africa'
const CLOUD_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'scanid_sdk_token';
// Import conditionnel SecureStore (expo-secure-store)
// Fallback sur AsyncStorage si SecureStore absent
let SecureStore = null;
let AsyncStorage = null;
try {
    SecureStore = require('expo-secure-store');
}
catch (_a) { }
try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
}
catch (_b) { }
export function useSdkLicence(config) {
    const [status, setStatus] = useState({
        state: 'idle',
        plan: null,
        expiresAt: null,
        error: null,
    });
    const isMountedRef = useRef(true);
    const retryTimerRef = useRef(null);
    useEffect(() => {
        isMountedRef.current = true;
        validate();
        return () => {
            isMountedRef.current = false;
            if (retryTimerRef.current)
                clearTimeout(retryTimerRef.current);
        };
    }, [config.sdkKey]);
    const validate = useCallback(async () => {
        var _a, _b, _c, _d;
        if (!isMountedRef.current)
            return;
        setStatus((s) => (Object.assign(Object.assign({}, s), { state: 'validating', error: null })));
        try {
            // 1. Vérifier le cache SecureStore
            const cached = await getCachedToken(config);
            if (cached && isMountedRef.current) {
                setStatus({
                    state: 'valid',
                    plan: cached.plan,
                    expiresAt: cached.expiresAt,
                    error: null,
                });
                scheduleRevalidation(cached.expiresAt);
                return;
            }
            // 2. Pas de cache valide → appel API
            const result = await requestToken(config);
            if (!isMountedRef.current)
                return;
            // 3. Stocker le token dans SecureStore
            await storeToken(result.token, result.plan, result.expiresAt);
            setStatus({
                state: 'valid',
                plan: result.plan,
                expiresAt: result.expiresAt,
                error: null,
            });
            scheduleRevalidation(result.expiresAt);
        }
        catch (err) {
            if (!isMountedRef.current)
                return;
            const isNetworkError = ((_a = err.message) === null || _a === void 0 ? void 0 : _a.includes('fetch')) ||
                ((_b = err.message) === null || _b === void 0 ? void 0 : _b.includes('network')) ||
                ((_c = err.message) === null || _c === void 0 ? void 0 : _c.includes('Network'));
            setStatus({
                state: isNetworkError ? 'error' : 'invalid',
                plan: null,
                expiresAt: null,
                error: (_d = err.message) !== null && _d !== void 0 ? _d : 'Erreur de validation de licence',
            });
            // Retry automatique si erreur réseau (pas si clé invalide)
            if (isNetworkError) {
                retryTimerRef.current = setTimeout(validate, 30000);
            }
        }
    }, [config.sdkKey, config.apiUrl, config.appId]);
    function scheduleRevalidation(expiresAt) {
        const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
        // Re-valider 5 min avant expiration, minimum 1 min
        const msUntilRetry = Math.max(msUntilExpiry - 5 * 60 * 1000, 60000);
        retryTimerRef.current = setTimeout(async () => {
            await clearStoredToken();
            validate();
        }, msUntilRetry);
    }
    return {
        licenceState: status.state,
        licencePlan: status.plan,
        licenceExpiry: status.expiresAt,
        licenceError: status.error,
        isLicenceValid: status.state === 'valid',
        revalidate: validate,
    };
}
// ─── Storage — SecureStore en priorité, AsyncStorage en fallback ──────────────
async function readSecure(key) {
    try {
        if (SecureStore)
            return await SecureStore.getItemAsync(key);
        if (AsyncStorage)
            return await AsyncStorage.getItem(key);
        return null;
    }
    catch (_a) {
        return null;
    }
}
async function writeSecure(key, value) {
    try {
        if (SecureStore) {
            await SecureStore.setItemAsync(key, value, {
                keychainAccessible: SecureStore.WHEN_UNLOCKED,
            });
        }
        else if (AsyncStorage) {
            await AsyncStorage.setItem(key, value);
        }
    }
    catch (_a) { }
}
async function deleteSecure(key) {
    try {
        if (SecureStore)
            await SecureStore.deleteItemAsync(key);
        else if (AsyncStorage)
            await AsyncStorage.removeItem(key);
    }
    catch (_a) { }
}
// ─── Helpers token ────────────────────────────────────────────────────────────
async function getCachedToken(config) {
    var _a, _b;
    try {
        const raw = await readSecure(STORAGE_KEY);
        if (!raw)
            return null;
        const { token, plan, expiresAt } = JSON.parse(raw);
        // Token expiré ou expire dans moins de 5 min
        const margin = 5 * 60 * 1000;
        if (new Date(expiresAt).getTime() - margin < Date.now()) {
            await deleteSecure(STORAGE_KEY);
            return null;
        }
        // Vérifier côté serveur
        const baseUrl = (_b = (_a = config.apiUrl) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, '')) !== null && _b !== void 0 ? _b : CLOUD_BASE_URL;
        const res = await fetch(`${baseUrl}/sdk/verify?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
            await deleteSecure(STORAGE_KEY);
            return null;
        }
        return { plan, expiresAt };
    }
    catch (_c) {
        return null;
    }
}
async function storeToken(token, plan, expiresAt) {
    await writeSecure(STORAGE_KEY, JSON.stringify({ token, plan, expiresAt }));
}
async function clearStoredToken() {
    await deleteSecure(STORAGE_KEY);
}
async function requestToken(config) {
    var _a, _b, _c;
    const baseUrl = (_b = (_a = config.apiUrl) === null || _a === void 0 ? void 0 : _a.replace(/\/$/, '')) !== null && _b !== void 0 ? _b : CLOUD_BASE_URL;
    const response = await fetch(`${baseUrl}/sdk/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sdkKey: config.sdkKey,
            appId: config.appId,
        }),
    });
    const json = await response.json();
    if (!response.ok) {
        throw new Error((_c = json === null || json === void 0 ? void 0 : json.message) !== null && _c !== void 0 ? _c : `Erreur serveur (${response.status})`);
    }
    return {
        token: json.token,
        plan: json.plan,
        expiresAt: json.expiresAt,
    };
}
