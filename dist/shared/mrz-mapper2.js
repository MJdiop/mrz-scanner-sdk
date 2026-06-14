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
export function mapVisionCameraResult(raw) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const docType = detectDocumentType((_a = raw.documentType) !== null && _a !== void 0 ? _a : '');
    const fields = {
        surname: (_c = (_b = raw.surname) !== null && _b !== void 0 ? _b : raw.lastName) !== null && _c !== void 0 ? _c : null,
        givenNames: (_e = (_d = raw.givenNames) !== null && _d !== void 0 ? _d : raw.firstName) !== null && _e !== void 0 ? _e : null,
        nationality: (_f = raw.nationality) !== null && _f !== void 0 ? _f : null,
        issuingState: (_g = raw.issuingState) !== null && _g !== void 0 ? _g : null,
        dateOfBirth: (_j = (_h = raw.birthDate) !== null && _h !== void 0 ? _h : raw.dateOfBirth) !== null && _j !== void 0 ? _j : null,
        sex: normalizeSex(raw.sex),
        expirationDate: (_l = (_k = raw.expirationDate) !== null && _k !== void 0 ? _k : raw.dateOfExpiry) !== null && _l !== void 0 ? _l : null,
        documentNumber: (_m = raw.documentNumber) !== null && _m !== void 0 ? _m : null,
        personalNumber: (_o = raw.personalNumber) !== null && _o !== void 0 ? _o : null,
    };
    return {
        documentType: docType,
        documentLabel: getDocumentLabel(docType),
        corrected: false, // OCR local, pas de correction mrz-fast
        fields,
    };
}
function detectDocumentType(raw) {
    const t = raw.toUpperCase();
    if (t.startsWith('P'))
        return 'TD3_PASSPORT';
    if (t.startsWith('I') || t.startsWith('A'))
        return 'TD1_ID';
    if (t.startsWith('V'))
        return 'TD2';
    if (t.startsWith('D'))
        return 'DL';
    return 'TD3_PASSPORT'; // fallback passeport
}
function getDocumentLabel(type) {
    const labels = {
        TD3_PASSPORT: 'Passeport',
        TD1_ID: "Carte d'identité ",
        TD2: 'Visa / titre de voyage',
        DL: 'Permis de conduire',
    };
    return labels[type];
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
