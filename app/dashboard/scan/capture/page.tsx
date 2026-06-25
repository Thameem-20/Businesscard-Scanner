'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Zap, ZapOff, AlertTriangle, Loader2 } from 'lucide-react';

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 200;

export default function CapturePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera not supported on this device or browser.');
      setIsLoading(false);
      return;
    }

    try {
      stopCamera();
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsLoading(false);
        };
      }

      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities?.torch) {
        setHasFlash(true);
      }

      setError(null);
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsLoading(false);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please enable camera in settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another app.');
      } else {
        // Try with simpler constraints
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(simpleStream);
          if (videoRef.current) {
            videoRef.current.srcObject = simpleStream;
            videoRef.current.onloadedmetadata = () => setIsLoading(false);
          }
          setError(null);
        } catch (e) {
          setError('Could not access camera.');
        }
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleFlash = async () => {
    if (!stream || !hasFlash) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({ advanced: [{ torch: !flashEnabled } as any] });
      setFlashEnabled(!flashEnabled);
    } catch (err) {
      console.error('Flash toggle failed:', err);
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
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

    // Get dimensions for cropping to frame
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

    // Flash effect
    const flashOverlay = document.getElementById('flash-overlay');
    if (flashOverlay) {
      flashOverlay.classList.add('opacity-100');
      setTimeout(() => flashOverlay.classList.remove('opacity-100'), 150);
    }

    // Convert to blob and send to API
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

        // Store result in sessionStorage and navigate back
        sessionStorage.setItem('scanResult', JSON.stringify(data));
        stopCamera();
        router.push('/dashboard/scan');
        
      } catch (err: any) {
        setError(err.message || 'Failed to process image');
        setIsCapturing(false);
        setIsProcessing(false);
      }
    }, 'image/jpeg', 0.92);
  }, [isCapturing, isProcessing, router]);

  // Error screen
  if (error && !isLoading) {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    
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
              <ol className="text-white/70 text-sm space-y-1">
                <li>1. Open Settings → Safari</li>
                <li>2. Tap Camera</li>
                <li>3. Select Allow</li>
              </ol>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <button
              onClick={startCamera}
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
      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-6 relative">
            <div className="absolute inset-0 border-4 border-indigo-200/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-white text-lg font-medium">Starting camera...</p>
        </div>
      )}

      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Flash overlay */}
      <div
        id="flash-overlay"
        className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-150"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 bg-black/60" style={{ height: 'calc(50% - 100px)' }} />
        <div className="absolute bottom-0 left-0 right-0 bg-black/60" style={{ height: 'calc(50% - 100px)' }} />
        <div className="absolute left-0 bg-black/60" style={{ top: 'calc(50% - 100px)', height: '200px', width: 'calc(50% - 160px)' }} />
        <div className="absolute right-0 bg-black/60" style={{ top: 'calc(50% - 100px)', height: '200px', width: 'calc(50% - 160px)' }} />
      </div>

      {/* Frame */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative border-2 border-white rounded-lg" style={{ width: `${FRAME_WIDTH}px`, height: `${FRAME_HEIGHT}px` }}>
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute left-0 right-0 text-center" style={{ top: 'max(5rem, calc(env(safe-area-inset-top) + 3.5rem))' }}>
        <p className="text-white text-lg font-medium drop-shadow-lg">Align card within frame</p>
        <p className="text-white/70 text-sm mt-1 drop-shadow">Tap the button below to capture</p>
      </div>

      {/* Top controls */}
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

      {/* Capture button - positioned higher to avoid any bottom UI */}
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

      {/* Processing overlay */}
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
