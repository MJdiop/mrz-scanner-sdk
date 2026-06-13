// Import conditionnel mrz-fast
let parseMRZ = null;
let parseMrzGeneric = null;
try {
    parseMRZ = require('mrz-fast').parseMRZ;
}
catch (_a) { }
try {
    parseMrzGeneric = require('mrz').parse;
}
catch (_b) { }
const DOCUMENT_LABELS = {
    TD3: 'Passeport',
    TD1: "Carte d'identité nationale",
    TD2: 'Visa / titre de voyage',
    DL: 'Permis de conduire',
};
/**
 * Reçoit le texte brut OCR de MLKit,
 * extrait les lignes MRZ candidates et les parse.
 * Retourne null si aucune MRZ valide trouvée.
 */
export function mapMlkitResult(ocrText) {
    // Nettoyer et extraire les lignes candidates
    const lines = ocrText
        .split('\n')
        .map((l) => l.trim().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, ''))
        .filter((l) => l.length >= 28 && /^[A-Z0-9<]+$/.test(l));
    if (lines.length < 2)
        return null;
    // Détecter le type
    const type = detectType(lines);
    if (!type)
        return null;
    return parseLines(lines, type);
}
function detectType(lines) {
    if (lines.length >= 2 && lines[0].length === 44)
        return 'TD3';
    if (lines.length >= 3 && lines[0].length === 30)
        return 'TD1';
    if (lines.length >= 2 && lines[0].length === 36)
        return 'TD2';
    return null;
}
function parseLines(lines, type) {
    try {
        // TD3 → mrz-fast avec correction OCR
        if (type === 'TD3' && parseMRZ) {
            const result = parseMRZ([lines[0], lines[1]], { errorCorrection: true });
            if (!result.valid)
                return null;
            return {
                documentType: 'TD3',
                documentLabel: DOCUMENT_LABELS['TD3'],
                corrected: result.corrected,
                fields: normalizeFields(result.fields),
            };
        }
        // TD1 / TD2 → mrz (Zakodium)
        if (parseMrzGeneric) {
            const mrzLines = type === 'TD1' ? lines.slice(0, 3) : lines.slice(0, 2);
            const result = parseMrzGeneric(mrzLines, { autocorrect: true });
            if (!result.valid)
                return null;
            return {
                documentType: type,
                documentLabel: DOCUMENT_LABELS[type],
                corrected: false,
                fields: normalizeFields(result.fields),
            };
        }
        return null;
    }
    catch (_a) {
        return null;
    }
}
function normalizeFields(f) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    return {
        surname: (_a = f['lastName']) !== null && _a !== void 0 ? _a : null,
        givenNames: (_b = f['firstName']) !== null && _b !== void 0 ? _b : null,
        nationality: (_c = f['nationality']) !== null && _c !== void 0 ? _c : null,
        issuingState: (_d = f['issuingState']) !== null && _d !== void 0 ? _d : null,
        dateOfBirth: (_e = f['birthDate']) !== null && _e !== void 0 ? _e : null,
        sex: normalizeSex(f['sex']),
        expirationDate: (_f = f['expirationDate']) !== null && _f !== void 0 ? _f : null,
        documentNumber: (_g = f['documentNumber']) !== null && _g !== void 0 ? _g : null,
        personalNumber: (_h = f['personalNumber']) !== null && _h !== void 0 ? _h : null,
    };
}
function normalizeSex(raw) {
    if (!raw)
        return null;
    const s = raw.toUpperCase();
    if (s === 'M' || s === 'MALE')
        return 'male';
    if (s === 'F' || s === 'FEMALE')
        return 'female';
    return 'unspecified';
}
// Ré-export pour usage direct (web)
export { normalizeFields };
