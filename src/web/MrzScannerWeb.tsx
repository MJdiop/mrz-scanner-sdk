import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react';

import { useScanner } from '../shared/useScanner';
import { sendImageToApi } from '../shared/api-client';
import type {
  ApiConfig,
  MrzResult,
  MrzScannerWebProps,
  ScanState,
} from '../shared/types';

// ─── Label d'état ─────────────────────────────────────────────────────────────

function getLabel(state: ScanState, attempts: number, max: number): string {
  switch (state) {
    case 'idle':
      return 'Initialisation caméra…';
    case 'scanning':
      return 'Placez le document dans le cadre — zone MRZ en bas';
    case 'analyzing':
      return 'Analyse en cours…';
    case 'success':
      return '✓ Document reconnu !';
    case 'failed':
      return `Échec après ${attempts}/${max} tentatives`;
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

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
export function MrzScannerWeb({
  api,
  onSuccess,
  onError,
  onClose,
  maxAttempts = 10,
  scanIntervalMs = 1500,
  width = '100%',
  height = '480px',
  className,
}: MrzScannerWebProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camReady, setCamReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);

  // Démarrage de la caméra
  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' }, // caméra arrière si dispo
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            if (active) setCamReady(true);
          };
        }
      } catch (err) {
        if (active) {
          setCamError(
            "Impossible d'accéder à la caméra. Vérifiez les permissions.",
          );
          console.error('[MrzScannerWeb] Camera error:', err);
        }
      }
    }

    initCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /**
   * Capture une frame depuis le flux vidéo.
   * Recadrage automatique sur les 38% bas (zone MRZ).
   * Retourne un Blob JPEG prêt à envoyer à l'API.
   */
  const captureFrame = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !camReady) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    // Recadrage sur les 50% bas
    const cropY = Math.floor(vh * 0.5);
    const cropH = Math.floor(vh * 0.5);

    canvas.width = vw;
    canvas.height = cropH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, cropY, vw, cropH, 0, 0, vw, cropH);

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
  }, [camReady]);

  const handleSuccess = useCallback(
    (result: MrzResult) => {
      onSuccess(result);
    },
    [onSuccess],
  );

  const { scanState, attempts, start, reset } = useScanner({
    api,
    maxAttempts,
    scanIntervalMs,
    onSuccess: handleSuccess,
    onError,
    captureFrame: async () => {
      const blob = await captureFrame();
      return blob; // useScanner accepte Blob directement
    },
    sendToApi: async (cfg: ApiConfig, payload: string | Blob) =>
      sendImageToApi(cfg, payload as Blob),
  });

  // Démarrer dès que la caméra est prête
  useEffect(() => {
    if (camReady) start();
  }, [camReady]);

  // ─── Erreur caméra ──────────────────────────────────────────────────────────
  if (camError) {
    return (
      <div style={{ ...containerStyle, width, height }} className={className}>
        <div style={errorStyle}>
          <p style={{ color: '#fff', marginBottom: 16 }}>{camError}</p>
          {onClose && (
            <button style={btnStyle} onClick={onClose}>
              Fermer
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Frame principal ────────────────────────────────────────────────────────
  const isSuccess = scanState === 'success';
  const isFailed = scanState === 'failed';

  return (
    <div style={{ ...containerStyle, width, height }} className={className}>
      {/* Flux vidéo */}
      <video ref={videoRef} muted playsInline style={videoStyle} />

      {/* Canvas caché pour la capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Overlay masques */}
      <div style={overlayStyle}>
        {/* Masque haut */}
        <div style={{ ...maskStyle, flex: 3 }} />

        {/* Ligne MRZ */}
        <div style={{ display: 'flex', height: 90 }}>
          <div style={{ ...maskStyle, flex: 1 }} />

          {/* Cadre animé */}
          <div
            style={{
              ...frameStyle,
              borderColor: isSuccess ? '#34d399' : 'rgba(255,255,255,0.9)',
              boxShadow: isSuccess
                ? '0 0 0 2px #34d399, 0 0 20px rgba(52,211,153,0.3)'
                : camReady
                  ? '0 0 0 1px rgba(255,255,255,0.2)'
                  : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
              animation:
                scanState === 'scanning'
                  ? 'pulse 1.4s ease-in-out infinite'
                  : 'none',
            }}
          >
            {/* Coins */}
            <div
              style={{
                ...cornerStyle,
                top: 0,
                left: 0,
                borderRightWidth: 0,
                borderBottomWidth: 0,
              }}
            />
            <div
              style={{
                ...cornerStyle,
                top: 0,
                right: 0,
                borderLeftWidth: 0,
                borderBottomWidth: 0,
              }}
            />
            <div
              style={{
                ...cornerStyle,
                bottom: 0,
                left: 0,
                borderRightWidth: 0,
                borderTopWidth: 0,
              }}
            />
            <div
              style={{
                ...cornerStyle,
                bottom: 0,
                right: 0,
                borderLeftWidth: 0,
                borderTopWidth: 0,
              }}
            />

            {scanState === 'analyzing' && <div style={spinnerStyle} />}
            {isSuccess && (
              <span style={{ color: '#34d399', fontSize: 28, fontWeight: 700 }}>
                ✓
              </span>
            )}
          </div>

          <div style={{ ...maskStyle, flex: 1 }} />
        </div>

        {/* Masque bas */}
        <div style={{ ...maskStyle, flex: 2 }} />
      </div>

      {/* Label statut */}
      <div style={statusBarStyle}>
        <span style={statusTextStyle}>
          {getLabel(scanState, attempts, maxAttempts)}
        </span>

        {isFailed && (
          <button
            style={{ ...btnStyle, marginTop: 12 }}
            onClick={() => {
              reset();
              setTimeout(start, 100);
            }}
          >
            Réessayer
          </button>
        )}
      </div>

      {/* Bouton fermer */}
      {onClose && (
        <button
          style={closeBtnStyle}
          onClick={onClose}
          aria-label="Fermer le scanner"
        >
          ✕
        </button>
      )}

      {/* Animation pulse CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);     opacity: 1;    }
          50%       { transform: scale(1.015); opacity: 0.85; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles inline ────────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: '#000',
  borderRadius: 12,
};

const videoStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const overlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  pointerEvents: 'none',
};

const maskStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.55)',
};

const frameStyle: CSSProperties = {
  flex: 5,
  border: '2px solid rgba(255,255,255,0.9)',
  borderRadius: 6,
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const cornerStyle: CSSProperties = {
  position: 'absolute',
  width: 16,
  height: 16,
  borderStyle: 'solid',
  borderColor: '#fff',
  borderWidth: 2,
};

const spinnerStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 16,
  height: 16,
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#fff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const statusBarStyle: CSSProperties = {
  position: 'absolute',
  bottom: 40,
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0 24px',
  pointerEvents: 'none',
};

const statusTextStyle: CSSProperties = {
  color: '#fff',
  fontSize: 13,
  textAlign: 'center',
  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
};

const closeBtnStyle: CSSProperties = {
  position: 'absolute',
  top: 16,
  right: 16,
  background: 'rgba(0,0,0,0.4)',
  border: 'none',
  color: '#fff',
  fontSize: 18,
  width: 36,
  height: 36,
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const btnStyle: CSSProperties = {
  background: '#c8ff00',
  color: '#000',
  border: 'none',
  borderRadius: 8,
  padding: '10px 24px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  pointerEvents: 'auto',
};

const errorStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};
