import type { DocumentType, MrzFields, MrzResult } from './types';

/**
 * Mappe les résultats bruts de vision-camera-mrz-scanner
 * vers notre MrzResult unifié.
 *
 * vision-camera-mrz-scanner retourne un objet MRZProperties :
 * {
 *   documentType, surname, givenNames, nationality,
 *   birthDate, expirationDate, documentNumber,
 *   sex, personalNumber, issuingState, ...
 * }
 */
export function mapVisionCameraResult(raw: Record<string, string>): MrzResult {
  const docType = detectDocumentType(raw.documentType ?? '');

  const fields: MrzFields = {
    surname: raw.surname ?? raw.lastName ?? null,
    givenNames: raw.givenNames ?? raw.firstName ?? null,
    nationality: raw.nationality ?? null,
    issuingState: raw.issuingState ?? null,
    dateOfBirth: raw.birthDate ?? raw.dateOfBirth ?? null,
    sex: normalizeSex(raw.sex),
    expirationDate: raw.expirationDate ?? raw.dateOfExpiry ?? null,
    documentNumber: raw.documentNumber ?? null,
    personalNumber: raw.personalNumber ?? null,
  };

  return {
    documentType: docType,
    documentLabel: getDocumentLabel(docType),
    corrected: false, // OCR local, pas de correction mrz-fast
    fields,
  };
}

function detectDocumentType(raw: string): DocumentType {
  const t = raw.toUpperCase();
  if (t.startsWith('P')) return 'TD3_PASSPORT';
  if (t.startsWith('I') || t.startsWith('A')) return 'TD1_ID';
  if (t.startsWith('V')) return 'TD2';
  if (t.startsWith('D')) return 'DL';
  return 'TD3_PASSPORT'; // fallback passeport
}

function getDocumentLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    TD3_PASSPORT: 'Passeport',
    TD1_ID: "Carte d'identité ",
    TD2: 'Visa / titre de voyage',
    DL: 'Permis de conduire',
  };
  return labels[type];
}

function normalizeSex(raw?: string): MrzFields['sex'] {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (s === 'M' || s === 'MALE') return 'male';
  if (s === 'F' || s === 'FEMALE') return 'female';
  return 'unspecified';
}
