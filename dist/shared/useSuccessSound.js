import { useCallback, useEffect, useRef } from 'react';
import { SUCCESS_SOUND_BASE64 } from '../assets/successSound';
/**
 * Hook qui joue un son de succès.
 * Compatible expo-audio (nouveau) et expo-av (ancien) — détection automatique.
 *
 * - successSound={true}              → son bundlé par défaut
 * - successSound={false}             → son désactivé
 * - successSound={require('./beep')} → son custom
 */
export function useSuccessSound(successSound = true) {
    const playerRef = useRef(null);
    // Détection automatique expo-audio vs expo-av
    let ExpoAudio = null;
    let useExpoAudio = false;
    try {
        ExpoAudio = require('expo-audio');
        useExpoAudio = true;
    }
    catch (_a) {
        try {
            ExpoAudio = require('expo-av').Audio;
        }
        catch (_b) { }
    }
    useEffect(() => {
        return () => {
            var _a, _b, _c, _d;
            try {
                if (playerRef.current) {
                    if (useExpoAudio) {
                        (_b = (_a = playerRef.current).remove) === null || _b === void 0 ? void 0 : _b.call(_a);
                    }
                    else {
                        (_d = (_c = playerRef.current).unloadAsync) === null || _d === void 0 ? void 0 : _d.call(_c);
                    }
                }
            }
            catch (_e) { }
        };
    }, []);
    const play = useCallback(async () => {
        var _a, _b, _c, _d, _e;
        if (successSound === false || !ExpoAudio)
            return;
        const source = successSound === true || successSound === undefined
            ? { uri: SUCCESS_SOUND_BASE64 }
            : successSound;
        try {
            // ── expo-audio (nouveau API) ─────────────────────────────────────────
            if (useExpoAudio) {
                // expo-audio utilise useAudioPlayer hook, mais pour usage impératif :
                // AudioPlayer est accessible via createAudioPlayer ou useAudioPlayer
                if (ExpoAudio.createAudioPlayer) {
                    const player = ExpoAudio.createAudioPlayer(source);
                    playerRef.current = player;
                    player.play();
                }
                else if (ExpoAudio.useAudioPlayer) {
                    // Fallback — certaines versions n'ont que le hook
                    // On passe par Sound si disponible
                    const { Sound } = ExpoAudio;
                    if (Sound) {
                        await ((_a = ExpoAudio.setAudioModeAsync) === null || _a === void 0 ? void 0 : _a.call(ExpoAudio, { playsInSilentModeIOS: true }));
                        const player = new Sound(source);
                        playerRef.current = player;
                        await ((_b = player.playAsync) === null || _b === void 0 ? void 0 : _b.call(player));
                    }
                }
                return;
            }
            // ── expo-av (ancien API) ─────────────────────────────────────────────
            await ((_c = ExpoAudio.setAudioModeAsync) === null || _c === void 0 ? void 0 : _c.call(ExpoAudio, {
                playsInSilentModeIOS: true,
                allowsRecordingIOS: false,
            }));
            if (playerRef.current) {
                await ((_e = (_d = playerRef.current).unloadAsync) === null || _e === void 0 ? void 0 : _e.call(_d).catch(() => { }));
                playerRef.current = null;
            }
            const { sound } = await ExpoAudio.Sound.createAsync(source, {
                shouldPlay: true,
                volume: 1.0,
            });
            playerRef.current = sound;
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync().catch(() => { });
                    playerRef.current = null;
                }
            });
        }
        catch (err) {
            console.warn('[MRZ Sound]', err);
        }
    }, [successSound, ExpoAudio, useExpoAudio]);
    return { play };
}
