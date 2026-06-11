// ─────────────────────────────────────────────────────────────────────────────
// EXEMPLE 1 — React Native / Expo (Seetko)
// Scan automatique dans un Modal, self-hosted sur ton instance mrz-nest
// ─────────────────────────────────────────────────────────────────────────────

/*
import React, { useState } from 'react'
import { Modal, View } from 'react-native'
import { MrzScannerNative, type MrzResult } from '@scanid/mrz-scanner'

export function DocumentScanScreen() {
  const [showScanner, setShowScanner] = useState(false)
  const [result, setResult] = useState<MrzResult | null>(null)

  function handleSuccess(data: MrzResult) {
    setShowScanner(false)
    setResult(data)

    // Pré-remplir le formulaire Seetko avec les données MRZ
    console.log({
      nom:         data.fields.surname,
      prenom:      data.fields.givenNames,
      nationalite: data.fields.nationality,
      dateNaiss:   data.fields.dateOfBirth,
      numDoc:      data.fields.documentNumber,
    })
  }

  return (
    <>
      <Modal visible={showScanner} animationType="slide">
        <MrzScannerNative
          // Self-hosted : ton instance mrz-nest locale
          api={{ mode: 'selfhosted', apiUrl: 'http://192.168.1.10:3000' }}

          // Ou cloud ScanID Africa :
          // api={{ mode: 'cloud', apiKey: 'sk_live_...', region: 'west-africa' }}

          onSuccess={handleSuccess}
          onError={(err) => console.error('Scan échoué:', err.message)}
          onClose={() => setShowScanner(false)}

          // Optionnel
          maxAttempts={12}
          scanIntervalMs={1500}
          hint="Placez le bas du document dans le cadre"
          frameColor="#c8ff00"
          successColor="#34d399"
        />
      </Modal>
    </>
  )
}
*/


// ─────────────────────────────────────────────────────────────────────────────
// EXEMPLE 2 — Next.js 15 App Router
// Charger MrzScannerWeb côté client uniquement (pas de SSR possible)
// ─────────────────────────────────────────────────────────────────────────────

/*
// app/scan/page.tsx
'use client'

import dynamic from 'next/dynamic'
import type { MrzResult } from '@scanid/mrz-scanner'
import { useRouter } from 'next/navigation'

// Import dynamique côté client uniquement (getUserMedia n'existe pas côté serveur)
const MrzScannerWeb = dynamic(
  () => import('@scanid/mrz-scanner').then((m) => m.MrzScannerWeb),
  { ssr: false }
)

export default function ScanPage() {
  const router = useRouter()

  function handleResult(result: MrzResult) {
    console.log(result.fields)
    router.push('/dashboard')
  }

  return (
    <main style={{ padding: '24px', maxWidth: 600, margin: '0 auto' }}>
      <h1>Scanner votre document</h1>

      <MrzScannerWeb
        api={{ mode: 'cloud', apiKey: process.env.NEXT_PUBLIC_SCANID_API_KEY!, region: 'west-africa' }}
        onSuccess={handleResult}
        onClose={() => router.back()}
        width="100%"
        height="480px"
        maxAttempts={10}
        scanIntervalMs={1500}
      />
    </main>
  )
}
*/


// ─────────────────────────────────────────────────────────────────────────────
// EXEMPLE 3 — React standalone (Vite / CRA)
// Import direct, pas de dynamic()
// ─────────────────────────────────────────────────────────────────────────────

/*
import React from 'react'
import { MrzScannerWeb, type MrzResult } from '@scanid/mrz-scanner'

export function ScanPage() {
  function handleResult(result: MrzResult) {
    console.log('Document type:', result.documentType)
    console.log('Champs:', result.fields)
  }

  return (
    <MrzScannerWeb
      api={{ mode: 'selfhosted', apiUrl: 'https://your-api.com' }}
      onSuccess={handleResult}
      width={600}
      height={480}
    />
  )
}
*/
