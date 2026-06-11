import { type ReactElement } from 'react';
import type { MrzScannerWebProps } from '../shared/types';
/**
 * MrzScannerWeb
 *
 * Composant React web de scan MRZ automatique via getUserMedia.
 * Compatible Next.js (App Router) avec 'use client', Vite, CRA, etc.
 *
 * Next.js : importer avec dynamic() + { ssr: false }
 * ```ts
 * const MrzScannerWeb = dynamic(
 *   () => import('@scanid/mrz-scanner').then(m => m.MrzScannerWeb),
 *   { ssr: false }
 * )
 * ```
 *
 * Usage standard :
 * ```tsx
 * <MrzScannerWeb
 *   api={{ mode: 'cloud', apiKey: 'sk_...', region: 'west-africa' }}
 *   onSuccess={(r) => console.log(r.fields)}
 *   width="100%"
 *   height="480px"
 * />
 * ```
 */
export declare function MrzScannerWeb({ api, onSuccess, onError, onClose, maxAttempts, scanIntervalMs, width, height, className, }: MrzScannerWebProps): ReactElement;
