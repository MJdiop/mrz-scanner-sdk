import { LicenceState, useSdkLicence } from '../shared/licence';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
interface AppInitializerProps {
  /** Clé SDK obtenue sur scanid.africa — format sdk_live_xxx */
  sdkKey: string;
  /** URL self-hosted (optionnel — absent = cloud ScanID Africa) */
  apiUrl?: string;
  /** Bundle ID iOS ou Package Name Android — ex: "com.myapp.id" */
  appId?: string;
  children: React.ReactNode;
}

export function AppInitializer({
  sdkKey,
  apiUrl,
  appId,
  children,
}: AppInitializerProps) {
  const { licenceState, isLicenceValid, licenceError, revalidate } =
    useSdkLicence({
      sdkKey,
      apiUrl,
      appId,
    });

  // ── Validation en cours ──────────────────────────────────────────────────────
  if (licenceState === 'idle' || licenceState === 'validating') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c8ff00" />
        <Text style={styles.text}>Initialisation…</Text>
      </View>
    );
  }

  // ✅ Après — bloque tant que isLicenceValid n'est pas true
  // ── Licence invalide — clé expirée ou révoquée
  if (!isLicenceValid) {
    const isNetworkError = licenceState === ('error' as LicenceState);

    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>
          {isNetworkError ? '📡 Connexion requise' : '🔑 Licence invalide'}
        </Text>
        <Text style={styles.errorText}>
          {isNetworkError
            ? 'Impossible de valider votre licence. Vérifiez votre connexion internet.'
            : (licenceError ??
              'Clé SDK invalide. Renouvelez votre abonnement sur scanid.africa')}
        </Text>
        {isNetworkError && (
          <Pressable style={styles.retryBtn} onPress={revalidate}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // ── Licence valide ───────────────────────────────────────────────────────────
  return <>{children}</>;
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
