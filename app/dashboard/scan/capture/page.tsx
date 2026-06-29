'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Zap, ZapOff, AlertTriangle, Loader2 } from 'lucide-react';

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 200;
const CAMERA_TIMEOUT_MS = 15000;

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getUserMediaWithTimeout(
  constraints: MediaStreamConstraints,
  timeoutMs = CAMERA_TIMEOUT_MS
): Promise<MediaStream> {
  return Promise.race([
    navigator.mediaDevices.getUserMedia(constraints),
    new Promise<MediaStream>((_, reject) => {
      setTimeout(() => reject(new Error('Camera request timed out')), timeoutMs);
    }),
  ]);
}

export default function CapturePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasStartedRef = useRef(false);
  const facingModeRef = useRef<'environment' | 'user'>('environment');

  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingTap, setAwaitingTap] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStreamToVideo = useCallback(async (mediaStream: MediaStream): Promise<boolean> => {
    const video = videoRef.current;
    if (!video) return false;

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = mediaStream;

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        resolve(ok);
      };

      const timeout = window.setTimeout(() => {
        finish(video.videoWidth > 0 && video.videoHeight > 0);
      }, 8000);

      const onReady = async () => {
        try {
          await video.play();
        } catch {
          // iOS may still show frames even if play() rejects
        }
        window.clearTimeout(timeout);
        finish(video.videoWidth > 0 && video.videoHeight > 0);
      };

      video.onloadedmetadata = onReady;
      video.oncanplay = onReady;

      video.play().then(() => {
        if (video.videoWidth > 0) {
          window.clearTimeout(timeout);
          finish(true);
        }
      }).catch(() => {});
    });
  }, []);

  const requestCameraStream = useCallback(async (mode: 'environment' | 'user') => {
    const attempts: MediaStreamConstraints[] = [
      { video: { facingMode: mode }, audio: false },
      { video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];

    let lastError: unknown = new Error('Could not access camera');

    for (const constraints of attempts) {
      try {
        return await getUserMediaWithTimeout(constraints);
      } catch (err) {
        lastError = err;
        const name = (err as { name?: string })?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          throw err;
        }
      }
    }

    throw lastError;
  }, []);

  const startCamera = useCallback(async (mode?: 'environment' | 'user') => {
    const activeMode = mode ?? facingModeRef.current;
    setIsLoading(true);
    setError(null);
    setAwaitingTap(false);
    hasStartedRef.current = true;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported on this device or browser.');
      setIsLoading(false);
      return;
    }

    try {
      stopCamera();

      const mediaStream = await requestCameraStream(activeMode);
      streamRef.current = mediaStream;

      const attached = await attachStreamToVideo(mediaStream);
      if (!attached) {
        throw new Error('Camera preview failed to start');
      }

      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
      setHasFlash(Boolean(capabilities?.torch));
      setError(null);
    } catch (err: unknown) {
      console.error('Camera error:', err);
      stopCamera();

      const name = (err as { name?: string; message?: string })?.name;
      const message = (err as { message?: string })?.message;

      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please enable camera in settings.');
      } else if (name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (name === 'NotReadableError') {
        setError('Camera is being used by another app.');
      } else if (message === 'Camera request timed out') {
        setError('Camera took too long to open. Tap Try Again or reopen the app.');
      } else {
        setError('Could not access camera. Tap Try Again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [attachStreamToVideo, requestCameraStream, stopCamera]);

  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

  useEffect(() => {
    if (isIOSDevice() && isStandalonePWA()) {
      setAwaitingTap(true);
      return;
    }

    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    facingModeRef.current = next;
    setFacingMode(next);
    if (hasStartedRef.current) {
      startCamera(next);
    }
  };

  const toggleFlash = async () => {
    if (!streamRef.current || !hasFlash) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashEnabled } as MediaTrackConstraintSet] });
      setFlashEnabled(!flashEnabled);
    } catch (err) {
      console.error('Flash toggle failed:', err);
    }
  };

  const handleClose = () => {
    stopCamera();
    router.back();
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current || isCapturing || isProcessing) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setIsCapturing(false);
      return;
    }

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const displayAspect = containerWidth / containerHeight;
    const videoAspect = videoWidth / videoHeight;

    let scaleX: number, scaleY: number;
    let offsetX = 0, offsetY = 0;

    if (videoAspect > displayAspect) {
      scaleY = videoHeight / containerHeight;
      scaleX = scaleY;
      offsetX = (videoWidth - containerWidth * scaleX) / 2;
    } else {
      scaleX = videoWidth / containerWidth;
      scaleY = scaleX;
      offsetY = (videoHeight - containerHeight * scaleY) / 2;
    }

    const frameLeftInContainer = (containerWidth - FRAME_WIDTH) / 2;
    const frameTopInContainer = (containerHeight - FRAME_HEIGHT) / 2;

    const sourceX = offsetX + frameLeftInContainer * scaleX;
    const sourceY = offsetY + frameTopInContainer * scaleY;
    const sourceWidth = FRAME_WIDTH * scaleX;
    const sourceHeight = FRAME_HEIGHT * scaleY;

    const outputWidth = Math.min(sourceWidth, 1280);
    const outputHeight = Math.min(sourceHeight, 800);
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    context.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, outputWidth, outputHeight
    );

    const flashOverlay = document.getElementById('flash-overlay');
    if (flashOverlay) {
      flashOverlay.classList.add('opacity-100');
      setTimeout(() => flashOverlay.classList.remove('opacity-100'), 150);
    }

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsCapturing(false);
        return;
      }

      setIsProcessing(true);
      const file = new File([blob], 'business-card.jpg', { type: 'image/jpeg' });

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/cards/scan', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to scan card');
        }

        sessionStorage.setItem('scanResult', JSON.stringify(data));
        stopCamera();
        router.push('/dashboard/scan');
      } catch (err: unknown) {
        setError((err as { message?: string })?.message || 'Failed to process image');
        setIsCapturing(false);
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.92);
  }, [isCapturing, isProcessing, router, stopCamera]);

  const isIOS = isIOSDevice();
  const isPwa = isStandalonePWA();

  if (awaitingTap && !isLoading && !error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6">
        <button
          onClick={handleClose}
          className="absolute right-4 text-white/70 p-2 hover:text-white"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <X size={28} />
        </button>

        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-indigo-500/20 rounded-full flex items-center justify-center">
            <Camera className="w-10 h-10 text-indigo-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Open Camera</h2>
          <p className="text-white/70 mb-6">
            Tap below to allow camera access. This is required when using the app from your home screen.
          </p>

          <button
            onClick={() => startCamera()}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium mb-3"
          >
            Start Camera
          </button>
          <button
            onClick={handleClose}
            className="w-full text-white/70 py-3 rounded-xl font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-6">
        <button
          onClick={handleClose}
          className="absolute right-4 text-white/70 p-2 hover:text-white"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <X size={28} />
        </button>

        <div className="max-w-sm w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Camera Error</h2>
          <p className="text-white/70 mb-6">{error}</p>

          {isIOS && (
            <div className="bg-white/10 rounded-xl p-4 mb-6 text-left">
              <p className="text-white/90 text-sm font-medium mb-2">To enable camera:</p>
              {isPwa ? (
                <ol className="text-white/70 text-sm space-y-1">
                  <li>1. Open iPhone Settings</li>
                  <li>2. Scroll down to Card Scanner (or Safari)</li>
                  <li>3. Tap Camera → Allow</li>
                  <li>4. Return here and tap Try Again</li>
                </ol>
              ) : (
                <ol className="text-white/70 text-sm space-y-1">
                  <li>1. Open Settings → Safari</li>
                  <li>2. Tap Camera</li>
                  <li>3. Select Allow</li>
                </ol>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => startCamera()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium"
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="w-full text-white/70 py-3 rounded-xl font-medium"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black">
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-6 relative">
            <div className="absolute inset-0 border-4 border-indigo-200/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-white text-lg font-medium">Starting camera...</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      <div
        id="flash-overlay"
        className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150"
      />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: 'calc(50% - 100px)' }} />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: 'calc(50% - 100px)' }} />
        <div className="absolute left-0 bg-black/60" style={{ top: 'calc(50% - 100px)', height: '200px', width: 'calc(50% - 160px)' }} />
        <div className="absolute right-0 bg-black/60" style={{ top: 'calc(50% - 100px)', height: '200px', width: 'calc(50% - 160px)' }} />
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative border-2 border-white rounded-lg" style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` }}>
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
        </div>
      </div>

      <div className="absolute left-0 right-0 text-center" style={{ top: 'max(5rem, calc(env(safe-area-inset-top) + 3.5rem))' }}>
        <p className="text-white text-lg font-medium drop-shadow-lg">Align card within frame</p>
        <p className="text-white/70 text-sm mt-1 drop-shadow">Tap the button below to capture</p>
      </div>

      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 pt-12" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <button onClick={handleClose} className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white">
          <X size={24} />
        </button>

        <div className="flex gap-3">
          {hasFlash && (
            <button onClick={toggleFlash} className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white">
              {flashEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>
          )}
          <button onClick={switchCamera} className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white">
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-20 left-0 right-0 safe-area-bottom">
        <div className="flex flex-col items-center">
          <button
            onClick={capturePhoto}
            disabled={isCapturing || isProcessing || isLoading}
            className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95 shadow-lg"
          >
            <div className="w-16 h-16 rounded-full border-4 border-indigo-600 flex items-center justify-center">
              <Camera className="w-8 h-8 text-indigo-600" />
            </div>
          </button>
          <p className="text-white/60 text-sm mt-3">Tap to capture</p>
        </div>
      </div>

      {(isProcessing || isCapturing) && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
          <div className="bg-white rounded-3xl p-8 mx-6 max-w-sm w-full text-center shadow-2xl">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isCapturing && !isProcessing ? 'Capturing...' : 'Processing'}
            </h3>

            <p className="text-gray-500 text-sm mb-4">
              {isCapturing && !isProcessing ? 'Taking photo...' : 'Extracting contact info...'}
            </p>

            <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full animate-pulse"
                style={{ width: isCapturing && !isProcessing ? '30%' : '70%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
