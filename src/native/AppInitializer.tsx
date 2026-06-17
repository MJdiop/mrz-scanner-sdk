import { useSdkLicence } from '../shared/licence'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

const SDK_CONFIG = {
  sdkKey: process.env.EXPO_PUBLIC_SCANID_SDK_KEY ?? 'sdk_live_xxx',
  apiUrl: process.env.EXPO_PUBLIC_SCANID_API_URL,  // absent = cloud ScanID Africa
  appId:  'com.seetko.app',
}

interface Props {
  children: React.ReactNode
}

export function AppInitializer({ children }: Props) {
  const { licenceState, isLicenceValid, licenceError, revalidate } =
    useSdkLicence(SDK_CONFIG)

  // ── Validation en cours ──────────────────────────────────────────────────────
  if (licenceState === 'idle' || licenceState === 'validating') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c8ff00" />
        <Text style={styles.text}>Initialisation…</Text>
      </View>
    )
  }

  // ── Erreur réseau — app utilisable, scanner bloqué ───────────────────────────
  if (licenceState === 'error') {
    // On laisse quand même l'app démarrer — le scanner affichera
    // l'erreur uniquement quand l'utilisateur essaiera de scanner
    console.warn('[ScanID] Erreur réseau licence:', licenceError)
    return <>{children}</>
  }

  // ── Licence invalide — clé expirée ou révoquée ───────────────────────────────
  if (!isLicenceValid && licenceState === 'invalid') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>🔑 Licence expirée</Text>
        <Text style={styles.errorText}>
          {licenceError ?? 'Clé SDK invalide. Renouvelez votre abonnement sur scanid.africa'}
        </Text>
      </View>
    )
  }

  // ── Licence valide ───────────────────────────────────────────────────────────
  return <>{children}</>
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
})
