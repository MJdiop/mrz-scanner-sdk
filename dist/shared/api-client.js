const CLOUD_BASE_URL = 'http://localhost:3000';
// const CLOUD_BASE_URL = 'https://api.scanid.africa'
/**
 * Résout l'URL de l'endpoint scan selon la config (self-hosted ou cloud).
 */
function resolveEndpoint(api) {
    var _a;
    if (api.mode === 'selfhosted') {
        return `${api.apiUrl.replace(/\/$/, '')}/mrz/scan`;
    }
    // Cloud : routing régional optionnel
    const region = (_a = api.region) !== null && _a !== void 0 ? _a : 'auto';
    const base = region === 'west-africa'
        ? 'https://wa.api.scanid.africa'
        : region === 'north-africa'
            ? 'https://na.api.scanid.africa'
            : CLOUD_BASE_URL;
    console.log('🚀 ~ resolveEndpoint ~ base:', base);
    return `${base}/mrz/scan`;
}
/**
 * Construit les headers selon le mode.
 * Self-hosted : pas d'auth par défaut.
 * Cloud : Bearer token depuis la clé API.
 */
function buildHeaders(api) {
    if (api.mode === 'cloud') {
        return { Authorization: `Bearer ${api.apiKey}` };
    }
    return {};
}
/**
 * Envoie un blob/File image à l'API MRZ et retourne le résultat parsé.
 * Utilisable depuis React Native (uri → FormData) et depuis le web (File/Blob).
 */
export async function sendImageToApi(api, imageBlob, filename = 'mrz.jpg') {
    var _a, _b;
    const formData = new FormData();
    formData.append('image', imageBlob, filename);
    const response = await fetch(resolveEndpoint(api), {
        method: 'POST',
        headers: buildHeaders(api),
        body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
        throw new Error((_b = (_a = json === null || json === void 0 ? void 0 : json.message) !== null && _a !== void 0 ? _a : json === null || json === void 0 ? void 0 : json.error) !== null && _b !== void 0 ? _b : `Erreur API (${response.status})`);
    }
    return json.data;
}
/**
 * Variante React Native : construit un FormData compatible RN
 * à partir d'un URI local (retourné par expo-camera).
 */
export async function sendUriToApi(api, uri) {
    var _a, _b;
    const formData = new FormData();
    // React Native accepte un objet { uri, name, type } dans FormData
    formData.append('image', {
        uri,
        name: 'mrz.jpg',
        type: 'image/jpeg',
    });
    const response = await fetch(resolveEndpoint(api), {
        method: 'POST',
        headers: buildHeaders(api),
        body: formData,
    });
    const json = await response.json();
    if (!response.ok) {
        throw new Error((_b = (_a = json === null || json === void 0 ? void 0 : json.message) !== null && _a !== void 0 ? _a : json === null || json === void 0 ? void 0 : json.error) !== null && _b !== void 0 ? _b : `Erreur API (${response.status})`);
    }
    return json.data;
}
