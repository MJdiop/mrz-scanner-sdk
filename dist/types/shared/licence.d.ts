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
export type LicenceState = 'idle' | 'validating' | 'valid' | 'invalid' | 'error';
export interface LicenceStatus {
    state: LicenceState;
    plan: string | null;
    expiresAt: string | null;
    error: string | null;
}
export declare function useSdkLicence(config: SdkLicenceConfig): {
    licenceState: LicenceState;
    licencePlan: string | null;
    licenceExpiry: string | null;
    licenceError: string | null;
    isLicenceValid: boolean;
    revalidate: () => Promise<void>;
};
