import { useCallback, useEffect, useRef } from 'react'
import { SUCCESS_SOUND_BASE64 } from '../assets/successSound'

/**
 * Hook qui joue un son de succès.
 * Compatible expo-audio (nouveau) et expo-av (ancien) — détection automatique.
 *
 * - successSound={true}              → son bundlé par défaut
 * - successSound={false}             → son désactivé
 * - successSound={require('./beep')} → son custom
 */
export function useSuccessSound(successSound: boolean | any = true) {
  const playerRef = useRef<any>(null)

  // Détection automatique expo-audio vs expo-av
  let ExpoAudio: any = null
  let useExpoAudio = false

  try {
    ExpoAudio = require('expo-audio')
    useExpoAudio = true
  } catch {
    try {
      ExpoAudio = require('expo-av').Audio
    } catch {}
  }

  useEffect(() => {
    return () => {
      try {
        if (playerRef.current) {
          if (useExpoAudio) {
            playerRef.current.remove?.()
          } else {
            playerRef.current.unloadAsync?.()
          }
        }
      } catch {}
    }
  }, [])

  const play = useCallback(async () => {
    if (successSound === false || !ExpoAudio) return

    const source =
      successSound === true || successSound === undefined
        ? { uri: SUCCESS_SOUND_BASE64 }
        : successSound

    try {
      // ── expo-audio (nouveau API) ─────────────────────────────────────────
      if (useExpoAudio) {
        // expo-audio utilise useAudioPlayer hook, mais pour usage impératif :
        // AudioPlayer est accessible via createAudioPlayer ou useAudioPlayer
        if (ExpoAudio.createAudioPlayer) {
          const player = ExpoAudio.createAudioPlayer(source)
          playerRef.current = player
          player.play()
        } else if (ExpoAudio.useAudioPlayer) {
          // Fallback — certaines versions n'ont que le hook
          // On passe par Sound si disponible
          const { Sound } = ExpoAudio
          if (Sound) {
            await ExpoAudio.setAudioModeAsync?.({ playsInSilentModeIOS: true })
            const player = new Sound(source)
            playerRef.current = player
            await player.playAsync?.()
          }
        }
        return
      }

      // ── expo-av (ancien API) ─────────────────────────────────────────────
      await ExpoAudio.setAudioModeAsync?.({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      })

      if (playerRef.current) {
        await playerRef.current.unloadAsync?.().catch(() => {})
        playerRef.current = null
      }

      const { sound } = await ExpoAudio.Sound.createAsync(source, {
        shouldPlay: true,
        volume: 1.0,
      })

      playerRef.current = sound

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {})
          playerRef.current = null
        }
      })
    } catch (err) {
      console.warn('[MRZ Sound]', err)
    }
  }, [successSound, ExpoAudio, useExpoAudio])

  return { play }
}
