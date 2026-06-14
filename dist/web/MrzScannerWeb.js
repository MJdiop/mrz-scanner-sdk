import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from 'react';
import { useScanner } from '../shared/useScanner';
import { sendImageToApi } from '../shared/api-client';
// ─── Label d'état ─────────────────────────────────────────────────────────────
function getLabel(state, attempts, max) {
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
export function MrzScannerWeb({ api, onSuccess, onError, onClose, maxAttempts = 10, scanIntervalMs = 1500, width = '100%', height = '480px', className, }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [camReady, setCamReady] = useState(false);
    const [camError, setCamError] = useState(null);
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
                        var _a;
                        (_a = videoRef.current) === null || _a === void 0 ? void 0 : _a.play();
                        if (active)
                            setCamReady(true);
                    };
                }
            }
            catch (err) {
                if (active) {
                    setCamError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
                    console.error('[MrzScannerWeb] Camera error:', err);
                }
            }
        }
        initCamera();
        return () => {
            var _a;
            active = false;
            (_a = streamRef.current) === null || _a === void 0 ? void 0 : _a.getTracks().forEach((t) => t.stop());
        };
    }, []);
    /**
     * Capture une frame depuis le flux vidéo.
     * Recadrage automatique sur les 38% bas (zone MRZ).
     * Retourne un Blob JPEG prêt à envoyer à l'API.
     */
    const captureFrame = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !camReady)
            return null;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh)
            return null;
        // Recadrage sur les 50% bas
        const cropY = Math.floor(vh * 0.5);
        const cropH = Math.floor(vh * 0.5);
        canvas.width = vw;
        canvas.height = cropH;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return null;
        ctx.drawImage(video, 0, cropY, vw, cropH, 0, 0, vw, cropH);
        return new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });
    }, [camReady]);
    const handleSuccess = useCallback((result) => {
        onSuccess(result);
    }, [onSuccess]);
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
        sendToApi: async (cfg, payload) => sendImageToApi(cfg, payload),
    });
    // Démarrer dès que la caméra est prête
    useEffect(() => {
        if (camReady)
            start();
    }, [camReady]);
    // ─── Erreur caméra ──────────────────────────────────────────────────────────
    if (camError) {
        return (_jsx("div", { style: Object.assign(Object.assign({}, containerStyle), { width, height }), className: className, children: _jsxs("div", { style: errorStyle, children: [_jsx("p", { style: { color: '#fff', marginBottom: 16 }, children: camError }), onClose && (_jsx("button", { style: btnStyle, onClick: onClose, children: "Fermer" }))] }) }));
    }
    // ─── Frame principal ────────────────────────────────────────────────────────
    const isSuccess = scanState === 'success';
    const isFailed = scanState === 'failed';
    return (_jsxs("div", { style: Object.assign(Object.assign({}, containerStyle), { width, height }), className: className, children: [_jsx("video", { ref: videoRef, muted: true, playsInline: true, style: videoStyle }), _jsx("canvas", { ref: canvasRef, style: { display: 'none' } }), _jsxs("div", { style: overlayStyle, children: [_jsx("div", { style: Object.assign(Object.assign({}, maskStyle), { flex: 3 }) }), _jsxs("div", { style: { display: 'flex', height: 90 }, children: [_jsx("div", { style: Object.assign(Object.assign({}, maskStyle), { flex: 1 }) }), _jsxs("div", { style: Object.assign(Object.assign({}, frameStyle), { borderColor: isSuccess ? '#34d399' : 'rgba(255,255,255,0.9)', boxShadow: isSuccess
                                        ? '0 0 0 2px #34d399, 0 0 20px rgba(52,211,153,0.3)'
                                        : camReady
                                            ? '0 0 0 1px rgba(255,255,255,0.2)'
                                            : 'none', transition: 'border-color 0.3s, box-shadow 0.3s', animation: scanState === 'scanning'
                                        ? 'pulse 1.4s ease-in-out infinite'
                                        : 'none' }), children: [_jsx("div", { style: Object.assign(Object.assign({}, cornerStyle), { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 }) }), _jsx("div", { style: Object.assign(Object.assign({}, cornerStyle), { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 }) }), _jsx("div", { style: Object.assign(Object.assign({}, cornerStyle), { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 }) }), _jsx("div", { style: Object.assign(Object.assign({}, cornerStyle), { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 }) }), scanState === 'analyzing' && _jsx("div", { style: spinnerStyle }), isSuccess && (_jsx("span", { style: { color: '#34d399', fontSize: 28, fontWeight: 700 }, children: "\u2713" }))] }), _jsx("div", { style: Object.assign(Object.assign({}, maskStyle), { flex: 1 }) })] }), _jsx("div", { style: Object.assign(Object.assign({}, maskStyle), { flex: 2 }) })] }), _jsxs("div", { style: statusBarStyle, children: [_jsx("span", { style: statusTextStyle, children: getLabel(scanState, attempts, maxAttempts) }), isFailed && (_jsx("button", { style: Object.assign(Object.assign({}, btnStyle), { marginTop: 12 }), onClick: () => {
                            reset();
                            setTimeout(start, 100);
                        }, children: "R\u00E9essayer" }))] }), onClose && (_jsx("button", { style: closeBtnStyle, onClick: onClose, "aria-label": "Fermer le scanner", children: "\u2715" })), _jsx("style", { children: `
        @keyframes pulse {
          0%, 100% { transform: scale(1);     opacity: 1;    }
          50%       { transform: scale(1.015); opacity: 0.85; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      ` })] }));
}
// ─── Styles inline ────────────────────────────────────────────────────────────
const containerStyle = {
    position: 'relative',
    overflow: 'hidden',
    background: '#000',
    borderRadius: 12,
};
const videoStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
};
const overlayStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    pointerEvents: 'none',
};
const maskStyle = {
    background: 'rgba(0,0,0,0.55)',
};
const frameStyle = {
    flex: 5,
    border: '2px solid rgba(255,255,255,0.9)',
    borderRadius: 6,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};
const cornerStyle = {
    position: 'absolute',
    width: 16,
    height: 16,
    borderStyle: 'solid',
    borderColor: '#fff',
    borderWidth: 2,
};
const spinnerStyle = {
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
const statusBarStyle = {
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
const statusTextStyle = {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
};
const closeBtnStyle = {
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
const btnStyle = {
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
const errorStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
};
