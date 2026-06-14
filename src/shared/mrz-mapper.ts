import type { DocumentType, MrzFields, MrzResult } from './types';

// Import conditionnel mrz-fast
let parseMRZ: ((lines: [string, string], opts?: any) => any) | null = null;
let parseMrzGeneric: ((lines: string[], opts?: any) => any) | null = null;

try {
  parseMRZ = require('mrz-fast').parseMRZ;
} catch {}
try {
  parseMrzGeneric = require('mrz').parse;
} catch {}

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  TD3: 'Passeport',
  TD1: "Carte d'identité nationale",
  TD2: 'Visa / titre de voyage',
  DL: 'Permis de conduire',
};

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
export function mapMlkitResult(
  ocrText: string,
  ocrBlocks?: Array<{ text: string; lines?: Array<{ text: string }> }>,
): MrzResult | null {
  // 1. Extraire toutes les chaînes candidates depuis les blocs (plus fiable)
  const candidates = extractCandidates(ocrText, ocrBlocks);

  if (candidates.length < 2) return null;

  // 2. Détecter le type et parser
  const type = detectType(candidates);
  if (!type) return null;

  return parseLines(candidates, type);
}

/**
 * Extrait toutes les chaînes candidates MRZ depuis :
 * - Le texte global (image bien orientée)
 * - Les blocs individuels (image rotated — Android)
 * - Les lignes dans chaque bloc
 */
function extractCandidates(
  fullText: string,
  blocks?: Array<{ text: string; lines?: Array<{ text: string }> }>,
): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  function addCandidate(raw: string) {
    // Nettoyer : supprimer espaces, garder uniquement A-Z 0-9 <
    const cleaned = raw
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9<]/g, '');
    if (
      cleaned.length >= 28 &&
      /^[A-Z0-9<]+$/.test(cleaned) &&
      !seen.has(cleaned)
    ) {
      seen.add(cleaned);
      results.push(cleaned);
    }
  }

  // Source 1 : texte global ligne par ligne
  fullText.split('\n').forEach(addCandidate);

  // Source 2 : blocks individuels (Android rotated)
  if (blocks) {
    blocks.forEach((block) => {
      addCandidate(block.text);
      block.lines?.forEach((line) => addCandidate(line.text));
    });
  }

  return results;
}

function detectType(lines: string[]): DocumentType | null {
  // Chercher parmi tous les candidats, pas juste les deux premiers
  const td3lines = lines.filter((l) => l.length === 44);
  const td1lines = lines.filter((l) => l.length === 30);
  const td2lines = lines.filter((l) => l.length === 36);

  if (td3lines.length >= 2) return 'TD3';
  if (td1lines.length >= 3) return 'TD1';
  if (td2lines.length >= 2) return 'TD2';

  // Fallback : longueur exacte pas trouvée, essayer avec tolérance ±2
  const near44 = lines.filter((l) => l.length >= 42 && l.length <= 46);
  const near30 = lines.filter((l) => l.length >= 28 && l.length <= 32);

  if (near44.length >= 2) return 'TD3';
  if (near30.length >= 3) return 'TD1';

  return null;
}

function parseLines(lines: string[], type: DocumentType): MrzResult | null {
  try {
    if (type === 'TD3' && parseMRZ) {
      // Prendre les deux lignes de 44 chars (ou proche)
      const mrzLines = lines
        .filter((l) => l.length >= 42 && l.length <= 46)
        .slice(0, 2);

      if (mrzLines.length < 2) return null;

      // Normaliser à exactement 44 chars
      const l1 = mrzLines[0].slice(0, 44).padEnd(44, '<') as string;
      const l2 = mrzLines[1].slice(0, 44).padEnd(44, '<') as string;

      const result = parseMRZ?.([l1, l2], { errorCorrection: true });
      if (!result?.valid) {
        return null;
      }

      return {
        documentType: 'TD3',
        documentLabel: DOCUMENT_LABELS['TD3'],
        corrected: result.corrected,
        fields: normalizeFields(result.fields),
      };
    }

    if (parseMrzGeneric) {
      const count = type === 'TD1' ? 3 : 2;
      const targetLen = type === 'TD1' ? 30 : 36;
      const mrzLines = lines
        .filter((l) => l.length >= targetLen - 2 && l.length <= targetLen + 2)
        .slice(0, count)
        .map((l) => l.slice(0, targetLen).padEnd(targetLen, '<'));

      if (mrzLines.length < count) return null;

      const result = parseMrzGeneric(mrzLines, { autocorrect: true });
      if (!result.valid) return null;

      return {
        documentType: type,
        documentLabel: DOCUMENT_LABELS[type],
        corrected: false,
        fields: normalizeFields(result.fields),
      };
    }

    return null;
  } catch (err) {
    return null;
  }
}

function normalizeFields(f: Record<string, string | null>): MrzFields {
  return {
    surname: f['lastName'] ?? null,
    givenNames: f['firstName'] ?? null,
    nationality: f['nationality'] ?? null,
    issuingState: f['issuingState'] ?? null,
    dateOfBirth: f['birthDate'] ?? null,
    sex: normalizeSex(f['sex']),
    expirationDate: f['expirationDate'] ?? null,
    documentNumber: f['documentNumber'] ?? null,
    personalNumber: f['personalNumber'] ?? null,
  };
}

function normalizeSex(raw: string | null | undefined): MrzFields['sex'] {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s === 'M' || s === 'MALE') return 'male';
  if (s === 'F' || s === 'FEMALE') return 'female';
  return 'unspecified';
}

export { normalizeFields };
