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
 * Entrée principale depuis le composant natif.
 * Accepte soit le texte brut OCR, soit le résultat complet avec blocs.
 *
 * Sur Android, l'image est souvent en mode paysage (rotated 90°) :
 * les lignes MRZ apparaissent comme des blocs verticaux séparés dans
 * ocrResult.blocks, pas dans ocrResult.text.
 *
 * On cherche les lignes MRZ dans TOUS les blocs individuellement.
 */
export function mapMlkitResult(ocrText, ocrBlocks) {
    // 1. Extraire toutes les chaînes candidates depuis les blocs (plus fiable)
    const candidates = extractCandidates(ocrText, ocrBlocks);
    console.log('[MRZ-MAPPER] candidates:', candidates);
    if (candidates.length < 2)
        return null;
    // 2. Détecter le type et parser
    const type = detectType(candidates);
    if (!type)
        return null;
    return parseLines(candidates, type);
}
/**
 * Extrait toutes les chaînes candidates MRZ depuis :
 * - Le texte global (image bien orientée)
 * - Les blocs individuels (image rotated — Android)
 * - Les lignes dans chaque bloc
 */
function extractCandidates(fullText, blocks) {
    const seen = new Set();
    const results = [];
    function addCandidate(raw) {
        // Nettoyer : supprimer espaces, garder uniquement A-Z 0-9 <
        const cleaned = raw.trim().replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '');
        if (cleaned.length >= 28 && /^[A-Z0-9<]+$/.test(cleaned) && !seen.has(cleaned)) {
            seen.add(cleaned);
            results.push(cleaned);
        }
    }
    // Source 1 : texte global ligne par ligne
    fullText.split('\n').forEach(addCandidate);
    // Source 2 : blocks individuels (Android rotated)
    if (blocks) {
        blocks.forEach(block => {
            var _a;
            addCandidate(block.text);
            (_a = block.lines) === null || _a === void 0 ? void 0 : _a.forEach(line => addCandidate(line.text));
        });
    }
    return results;
}
function detectType(lines) {
    // Chercher parmi tous les candidats, pas juste les deux premiers
    const td3lines = lines.filter(l => l.length === 44);
    const td1lines = lines.filter(l => l.length === 30);
    const td2lines = lines.filter(l => l.length === 36);
    if (td3lines.length >= 2)
        return 'TD3';
    if (td1lines.length >= 3)
        return 'TD1';
    if (td2lines.length >= 2)
        return 'TD2';
    // Fallback : longueur exacte pas trouvée, essayer avec tolérance ±2
    const near44 = lines.filter(l => l.length >= 42 && l.length <= 46);
    const near30 = lines.filter(l => l.length >= 28 && l.length <= 32);
    if (near44.length >= 2)
        return 'TD3';
    if (near30.length >= 3)
        return 'TD1';
    return null;
}
function parseLines(lines, type) {
    try {
        if (type === 'TD3' && parseMRZ) {
            // Prendre les deux lignes de 44 chars (ou proche)
            const mrzLines = lines
                .filter(l => l.length >= 42 && l.length <= 46)
                .slice(0, 2);
            if (mrzLines.length < 2)
                return null;
            // Normaliser à exactement 44 chars
            const l1 = mrzLines[0].slice(0, 44).padEnd(44, '<');
            const l2 = mrzLines[1].slice(0, 44).padEnd(44, '<');
            console.log('[MRZ-MAPPER] TD3 lines:', l1, l2);
            const result = parseMRZ([l1, l2], { errorCorrection: true });
            if (!result.valid) {
                console.log('[MRZ-MAPPER] TD3 invalid after correction');
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
                .filter(l => l.length >= targetLen - 2 && l.length <= targetLen + 2)
                .slice(0, count)
                .map(l => l.slice(0, targetLen).padEnd(targetLen, '<'));
            if (mrzLines.length < count)
                return null;
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
    catch (err) {
        console.log('[MRZ-MAPPER] Parse error:', err);
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
export { normalizeFields };
