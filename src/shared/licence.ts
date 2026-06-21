import { useCallback, useEffect, useRef, useState } from 'react';

// const CLOUD_BASE_URL = 'https://api.scanid.africa'
const CLOUD_BASE_URL = 'http://localhost:3000';
const STORAGE_KEY = 'scanid_sdk_token';

// Import conditionnel SecureStore (expo-secure-store)
// Fallback sur AsyncStorage si SecureStore absent
let SecureStore: any = null;
let AsyncStorage: any = null;

try {
  SecureStore = require('expo-secure-store');
} catch {}

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

export interface SdkLicenceConfig {
  /** Clé SDK obtenue sur scanid.africa — format sdk_live_xxx */
  sdkKey: string;
  /**
   * URL de votre instance self-hosted (optionnel).
   * Si absent → utilise le cloud ScanID Africa.
   */
  apiUrl?: string;
  /**
   * Bundle ID iOS ou Package Name Android de votre app.
   * Requis si des restrictions sont configurées sur la clé.
   * ex: "com.seetko.app"
   */
  appId?: string;
}

export type LicenceState =
  | 'idle' // pas encore initialisé
  | 'validating' // appel en cours
  | 'valid' // token valide
  | 'invalid' // clé invalide ou expirée
  | 'error'; // erreur réseau

export interface LicenceStatus {
  state: LicenceState;
  plan: string | null;
  expiresAt: string | null;
  error: string | null;
}

export function useSdkLicence(config: SdkLicenceConfig) {
  const [status, setStatus] = useState<LicenceStatus>({
    state: 'idle',
    plan: null,
    expiresAt: null,
    error: null,
  });

  const isMountedRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    validate();
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [config.sdkKey]);

  const validate = useCallback(async () => {
    if (!isMountedRef.current) return;
    setStatus((s) => ({ ...s, state: 'validating', error: null }));

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
      if (!isMountedRef.current) return;

      // 3. Stocker le token dans SecureStore
      await storeToken(result.token, result.plan, result.expiresAt);

      setStatus({
        state: 'valid',
        plan: result.plan,
        expiresAt: result.expiresAt,
        error: null,
      });

      scheduleRevalidation(result.expiresAt);
    } catch (err: any) {
      if (!isMountedRef.current) return;

      const isNetworkError =
        err.message?.includes('fetch') ||
        err.message?.includes('network') ||
        err.message?.includes('Network');

      setStatus({
        state: isNetworkError ? 'error' : 'invalid',
        plan: null,
        expiresAt: null,
        error: err.message ?? 'Erreur de validation de licence',
      });

      // Retry automatique si erreur réseau (pas si clé invalide)
      if (isNetworkError) {
        retryTimerRef.current = setTimeout(validate, 30_000);
      }
    }
  }, [config.sdkKey, config.apiUrl, config.appId]);

  function scheduleRevalidation(expiresAt: string) {
    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    // Re-valider 5 min avant expiration, minimum 1 min
    const msUntilRetry = Math.max(msUntilExpiry - 5 * 60 * 1000, 60_000);

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

async function readSecure(key: string): Promise<string | null> {
  try {
    if (SecureStore) return await SecureStore.getItemAsync(key);
    if (AsyncStorage) return await AsyncStorage.getItem(key);
    return null;
  } catch {
    return null;
  }
}

async function writeSecure(key: string, value: string): Promise<void> {
  try {
    if (SecureStore) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
    } else if (AsyncStorage) {
      await AsyncStorage.setItem(key, value);
    }
  } catch {}
}

async function deleteSecure(key: string): Promise<void> {
  try {
    if (SecureStore) await SecureStore.deleteItemAsync(key);
    else if (AsyncStorage) await AsyncStorage.removeItem(key);
  } catch {}
}

// ─── Helpers token ────────────────────────────────────────────────────────────

async function getCachedToken(config: SdkLicenceConfig): Promise<{
  plan: string;
  expiresAt: string;
} | null> {
  try {
    const raw = await readSecure(STORAGE_KEY);
    if (!raw) return null;

    const { token, plan, expiresAt } = JSON.parse(raw);

    // Token expiré ou expire dans moins de 5 min
    const margin = 5 * 60 * 1000;
    if (new Date(expiresAt).getTime() - margin < Date.now()) {
      await deleteSecure(STORAGE_KEY);
      return null;
    }

    // Vérifier côté serveur
    const baseUrl = config.apiUrl?.replace(/\/$/, '') ?? CLOUD_BASE_URL;

    const res = await fetch(
      `${baseUrl}/sdk/verify?token=${encodeURIComponent(token)}`,
    );

    if (!res.ok) {
      await deleteSecure(STORAGE_KEY);
      return null;
    }

    return { plan, expiresAt };
  } catch {
    return null;
  }
}

async function storeToken(
  token: string,
  plan: string,
  expiresAt: string,
): Promise<void> {
  await writeSecure(STORAGE_KEY, JSON.stringify({ token, plan, expiresAt }));
}

async function clearStoredToken(): Promise<void> {
  await deleteSecure(STORAGE_KEY);
}

async function requestToken(config: SdkLicenceConfig): Promise<{
  token: string;
  plan: string;
  expiresAt: string;
}> {
  const baseUrl = config.apiUrl?.replace(/\/$/, '') ?? CLOUD_BASE_URL;

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
    throw new Error(json?.message ?? `Erreur serveur (${response.status})`);
  }

  return {
    token: json.token,
    plan: json.plan,
    expiresAt: json.expiresAt,
  };
}
