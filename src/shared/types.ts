// ─── Résultat MRZ ─────────────────────────────────────────────────────────────

export type DocumentType = 'TD1_ID' | 'TD2' | 'TD3_PASSPORT' | 'DL';

export interface MrzFields {
  surname: string | null;
  givenNames: string | null;
  nationality: string | null;
  issuingState: string | null;
  /** Date de naissance au format YYMMDD */
  dateOfBirth: string | null;
  sex: 'male' | 'female' | 'unspecified' | null;
  /** Date d'expiration au format YYMMDD */
  expirationDate: string | null;
  documentNumber: string | null;
  personalNumber: string | null;
}

export interface MrzResult {
  documentType: DocumentType;
  documentLabel: string;
  /** true si mrz-fast a auto-corrigé des erreurs OCR (O↔0, I↔1…) */
  corrected: boolean;
  fields: MrzFields;
}

export type ScanState =
  | 'idle'
  | 'scanning'
  | 'analyzing'
  | 'success'
  | 'failed';

// ─── Configuration API ────────────────────────────────────────────────────────

export type ApiMode = 'selfhosted' | 'cloud';

export interface SelfHostedConfig {
  mode: 'selfhosted';
  /** URL de votre instance mrz-nest, ex: "http://192.168.1.10:3000" */
  apiUrl: string;
}

export interface CloudConfig {
  mode: 'cloud';
  /** Clé API obtenue sur scanid.africa */
  apiKey: string;
  /** Région optionnelle : "west-africa" | "north-africa" | "auto" */
  region?: 'west-africa' | 'north-africa' | 'auto';
}

export type ApiConfig = SelfHostedConfig | CloudConfig;

// ─── Props communes aux deux composants ──────────────────────────────────────

export interface MrzScannerBaseProps {
  /** Configuration de connexion à l'API */
  api?: ApiConfig;
  /** Appelé dès qu'une MRZ valide est détectée */
  onSuccess: (result: MrzResult) => void;
  /** Appelé si le scan échoue après MAX_ATTEMPTS tentatives */
  onError?: (error: Error) => void;
  /** Appelé à chaque fermeture du scanner */
  onClose?: () => void;
  /** Nombre max de tentatives avant d'abandonner (défaut: 10) */
  maxAttempts?: number;
  /** Intervalle entre deux captures en ms (défaut: 1500) */
  scanIntervalMs?: number;
}

// ─── Props React Native ───────────────────────────────────────────────────────

export interface MrzScannerNativeProps extends MrzScannerBaseProps {
  /** Texte affiché sous le cadre (défaut: "Alignez la zone MRZ dans le cadre") */
  hint?: string;
  /** Couleur du cadre de scan (défaut: "#FFFFFF") */
  frameColor?: string;
  /** Couleur du cadre en cas de succès (défaut: "#34d399") */
  successColor?: string;
  /** Afficher le feedback visuel sur la zone détectée (défaut: true) */
  enableMRZFeedBack?: boolean;

  /**
   * Son joué lors d'un scan réussi.
   * - true (défaut) : son bundlé dans le SDK
   * - false         : son désactivé
   * - require('./beep.mp3') : son custom du projet consommateur
   */
  successSound?: boolean | any;
}

// ─── Props React Web ──────────────────────────────────────────────────────────

export interface MrzScannerWebProps extends MrzScannerBaseProps {
  /** Largeur du composant (défaut: "100%") */
  width?: string | number;
  /** Hauteur du composant (défaut: "480px") */
  height?: string | number;
  /** Classe CSS additionnelle sur le conteneur */
  className?: string;
}
