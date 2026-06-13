import type { MrzFields, MrzResult } from './types';
/**
 * Entrée principale depuis le composant natif.
 * Accepte soit le texte brut OCR, soit le résultat complet avec blocs.
 *
 * Sur Android, l'image est souvent en mode paysage (rotated 90°) :
 * les lignes MRZ apparaissent comme des blocs verticaux séparés dans
 * ocrResult.blocks, pas dans ocrResult.text.
 *
 * On cherche les lignes MRZ dans TOUS les blocs individuellement.
 */
export declare function mapMlkitResult(ocrText: string, ocrBlocks?: Array<{
    text: string;
    lines?: Array<{
        text: string;
    }>;
}>): MrzResult | null;
declare function normalizeFields(f: Record<string, string | null>): MrzFields;
export { normalizeFields };
