interface AppInitializerProps {
    /** Clé SDK obtenue sur scanid.africa — format sdk_live_xxx */
    sdkKey: string;
    /** URL self-hosted (optionnel — absent = cloud ScanID Africa) */
    apiUrl?: string;
    /** Bundle ID iOS ou Package Name Android — ex: "com.myapp.id" */
    appId?: string;
    children: React.ReactNode;
}
export declare function AppInitializer({ sdkKey, apiUrl, appId, children, }: AppInitializerProps): import("react").JSX.Element;
export {};
