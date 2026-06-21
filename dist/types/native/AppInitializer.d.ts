interface AppInitializerProps {
    /** Clé SDK obtenue sur scanid.africa — format sdk_live_xxx */
    sdkKey: string;
    /** URL self-hosted (optionnel — absent = cloud ScanID Africa) */
    apiUrl?: string;
    /** Bundle ID iOS ou Package Name Android — ex: "com.myapp.id" */
    appId?: string;
    children: React.ReactNode;
}
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
export declare function AppInitializer({ sdkKey, apiUrl, appId, children, }: AppInitializerProps): import("react").JSX.Element;
export {};
