import type { MrzResult } from './types';
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
export declare function mapVisionCameraResult(raw: Record<string, string>): MrzResult;
