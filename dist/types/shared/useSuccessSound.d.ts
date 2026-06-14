/**
 * Hook qui joue un son de succès.
 * Compatible expo-audio (nouveau) et expo-av (ancien) — détection automatique.
 *
 * - successSound={true}              → son bundlé par défaut
 * - successSound={false}             → son désactivé
 * - successSound={require('./beep')} → son custom
 */
export declare function useSuccessSound(successSound?: boolean | any): {
    play: () => Promise<void>;
};
