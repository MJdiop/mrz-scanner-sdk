import type { MrzFields, MrzResult } from './types';
/**
 * Reçoit le texte brut OCR de MLKit,
 * extrait les lignes MRZ candidates et les parse.
 * Retourne null si aucune MRZ valide trouvée.
 */
export declare function mapMlkitResult(ocrText: string): MrzResult | null;
declare function normalizeFields(f: Record<string, string | null>): MrzFields;
export { normalizeFields };
