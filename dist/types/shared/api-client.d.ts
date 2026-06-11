import type { ApiConfig, MrzResult } from './types';
/**
 * Envoie un blob/File image à l'API MRZ et retourne le résultat parsé.
 * Utilisable depuis React Native (uri → FormData) et depuis le web (File/Blob).
 */
export declare function sendImageToApi(api: ApiConfig, imageBlob: Blob | File, filename?: string): Promise<MrzResult>;
/**
 * Variante React Native : construit un FormData compatible RN
 * à partir d'un URI local (retourné par expo-camera).
 */
export declare function sendUriToApi(api: ApiConfig, uri: string): Promise<MrzResult>;
