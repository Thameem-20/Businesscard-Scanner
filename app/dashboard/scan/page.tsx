'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Camera, Building2, Phone, Mail, Globe, Save } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ExtractedData {
  name?: string;
  company?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  rawText: string;
}

interface MatchedCard {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  similarity: number;
}

export default function ScanPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [matchedCard, setMatchedCard] = useState<MatchedCard | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [editFormData, setEditFormData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define all callbacks BEFORE any hooks that depend on them
  const processImageFile = useCallback(async (file: File) => {
    setError('');
    setUploading(true);
    setExtractedData(null);
    setMatchedCard(null);
    setShowConfirm(false);
    setEditFormData(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

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

      if (data.duplicate) {
        setMatchedCard(data.matchedCard);
        setExtractedData({ ...data.extractedData, imageUrl: data.imageUrl });
        setEditFormData({ ...data.extractedData, imageUrl: data.imageUrl });
        setShowConfirm(true);
      } else {
        setExtractedData({ ...data.extractedData, imageUrl: data.imageUrl });
        setEditFormData({ ...data.extractedData, imageUrl: data.imageUrl });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  }, [router]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await processImageFile(file);
  }, [processImageFile]);

  // ALL hooks must be called before conditional returns
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
  });

  // Check for pending file from mobile bottom nav
  useEffect(() => {
    const pendingFileData = sessionStorage.getItem('pendingScanFile');
    const pendingFileName = sessionStorage.getItem('pendingScanFileName');
    const pendingFileType = sessionStorage.getItem('pendingScanFileType');
    
    if (pendingFileData && pendingFileName) {
      // Convert data URL back to File
      fetch(pendingFileData)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], pendingFileName, { type: pendingFileType || blob.type });
          processImageFile(file);
        });
      
      // Clear sessionStorage
      sessionStorage.removeItem('pendingScanFile');
      sessionStorage.removeItem('pendingScanFileName');
      sessionStorage.removeItem('pendingScanFileType');
    }
  }, [processImageFile]);

  // Auto-trigger file picker on mobile view (only if no pending file from bottom nav)
  useEffect(() => {
    // Check if there's a pending file first (handled by another useEffect)
    const hasPendingFile = sessionStorage.getItem('pendingScanFile');
    
    // Only on mobile and if no pending file
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile && !hasPendingFile && !extractedData && !showConfirm && !uploading && !showCamera) {
      // Small delay to ensure page is loaded and other effects have run
      const timer = setTimeout(() => {
        // Double-check no pending file was set in the meantime
        if (!sessionStorage.getItem('pendingScanFile')) {
          fileInputRef.current?.click();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [extractedData, showConfirm, uploading, showCamera]);

  // Handle file input change
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    // Reset input
    e.target.value = '';
  }, [processImageFile]);

  // Now conditional returns
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setCameraStream(stream);
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setError('Could not access camera: ' + (err.message || 'Permission denied'));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // Stop camera
      stopCamera();

      // Create File from blob
      const file = new File([blob], 'business-card.jpg', { type: 'image/jpeg' });

      // Process the captured image
      await processImageFile(file);
    }, 'image/jpeg', 0.9);
  };

  const handleUpdate = async () => {
    if (!matchedCard || !extractedData) return;

    setUploading(true);
    try {
      const imageUrl = (extractedData as any).imageUrl;
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: matchedCard.id,
          cardData: extractedData,
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update card');
      }

      router.push('/dashboard/cards');
    } catch (err: any) {
      setError(err.message || 'Failed to update card');
      setUploading(false);
    }
  };

  const handleCreateNew = async () => {
    if (!extractedData) return;

    setUploading(true);
    try {
      const imageUrl = (extractedData as any).imageUrl;
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createNew: true,
          cardData: extractedData,
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create card');
      }

      router.push('/dashboard/cards');
    } catch (err: any) {
      setError(err.message || 'Failed to create card');
      setUploading(false);
    }
  };

  const handleSaveNewCard = async () => {
    if (!editFormData) return;

    setIsSaving(true);
    setError('');
    try {
      const imageUrl = (editFormData as any).imageUrl;
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createNew: true,
          cardData: editFormData,
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save card');
      }

      router.push('/dashboard/cards');
    } catch (err: any) {
      setError(err.message || 'Failed to save card');
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-10 h-full w-full pb-32 md:pb-6">
      <div className="h-full w-full">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Scan Business Card</h1>
          <p className="text-gray-600">Upload an image or capture a photo of a business card</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Hidden file input for mobile auto-trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {showCamera ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  Capture Photo
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !showConfirm && !extractedData && (
            <div className="space-y-4">
              {/* Mobile: Simple message */}
              <div className="md:hidden">
                <div className="text-center py-12 px-4">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Ready to scan a business card?
                  </p>
                  <p className="text-gray-600">
                    Click the <span className="font-semibold text-indigo-600">Scan Card</span> button at the bottom to scan your business cards
                  </p>
                </div>
              </div>

              {/* Desktop: Take Photo and Upload Options */}
              <div className="hidden md:block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={startCamera}
                    className="flex flex-col items-center justify-center p-8 border-2 border-indigo-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <Camera className="h-12 w-12 text-indigo-600 mb-3" />
                    <p className="text-lg font-medium text-gray-900">Take Photo</p>
                    <p className="text-sm text-gray-500 mt-1">Use camera</p>
                  </button>
                  <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isDragActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-lg font-medium text-gray-900">Upload Image</p>
                    <p className="text-sm text-gray-500 mt-1">Choose from device</p>
                  </div>
                </div>
                {isDragActive && (
                  <div className="text-center p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-indigo-700">Drop the image here</p>
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-2">
                  Supports: PNG, JPG, JPEG, GIF, WEBP
                </p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium mb-2">Processing image with OCR...</p>
              <p className="text-sm text-gray-500">Optimizing image and extracting text (this may take 10-30 seconds)</p>
              <div className="mt-4 max-w-md mx-auto">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Duplicate Card Confirmation Modal */}
          <Dialog open={showConfirm && !!matchedCard} onOpenChange={(open) => {
            if (!open) {
              setShowConfirm(false);
              setMatchedCard(null);
              setExtractedData(null);
              setImagePreview(null);
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="text-yellow-600 h-5 w-5" />
                  Name Already Exists
                </DialogTitle>
                <DialogDescription>
                  A card with the name &quot;{extractedData?.name}&quot; already exists in your organization.
                </DialogDescription>
              </DialogHeader>

              {matchedCard && extractedData && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Existing Card:</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 break-words"><strong>Full name:</strong> {matchedCard.name || 'N/A'}</p>
                      {matchedCard.company && (
                        <p className="text-gray-700 break-words"><strong>Company:</strong> {matchedCard.company}</p>
                      )}
                      {matchedCard.email && (
                        <p className="text-gray-700 break-all"><strong>Email:</strong> {matchedCard.email}</p>
                      )}
                      {matchedCard.phone && (
                        <p className="text-gray-700 break-words"><strong>Phone:</strong> {matchedCard.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">New Card Data:</h4>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700 break-words"><strong>Full name:</strong> {extractedData.name || 'Not detected'}</p>
                      <p className="text-gray-700 break-words"><strong>Company:</strong> {extractedData.company || 'Not detected'}</p>
                      {extractedData.jobTitle && (
                        <p className="text-gray-700 break-words"><strong>Job Title:</strong> {extractedData.jobTitle}</p>
                      )}
                      <p className="text-gray-700 break-words"><strong>Phone:</strong> {extractedData.phone || 'Not detected'}</p>
                      <p className="text-gray-700 break-all"><strong>Email:</strong> {extractedData.email || 'Not detected'}</p>
                      {extractedData.website && (
                        <p className="text-gray-700 break-all"><strong>Website:</strong> {extractedData.website}</p>
                      )}
                      {extractedData.address && (
                        <p className="text-gray-700 break-words"><strong>Address:</strong> {extractedData.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleUpdate}
                      disabled={uploading}
                      className="flex-1"
                    >
                      {uploading ? 'Updating...' : 'Update Existing Card'}
                    </Button>
                    <Button
                      onClick={handleCreateNew}
                      disabled={uploading}
                      variant="outline"
                      className="flex-1"
                    >
                      Create New Card Anyway
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {extractedData && !showConfirm && editFormData && (
            <div className="mt-6 w-full">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 md:p-4 mb-4 flex items-center space-x-2">
                <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                <p className="text-green-700 font-medium text-sm md:text-base">Card scanned successfully! Review and edit the information below.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-4 flex items-center space-x-2">
                  <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                  <p className="text-red-700 text-sm md:text-base">{error}</p>
                </div>
              )}

              {imagePreview && (
                <div className="mb-4 w-full flex justify-center">
                  <div className="w-full max-w-md h-52 md:h-64 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Business card"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 md:p-6 w-full">
                <h3 className="font-semibold text-gray-900 mb-4 text-base md:text-lg">Extracted Information:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2">Full name:</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                      <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                      Company:
                    </label>
                    <input
                      type="text"
                      value={editFormData.company || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      placeholder="Enter company name"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2">Job Title:</label>
                    <input
                      type="text"
                      value={editFormData.jobTitle || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      placeholder="Enter job title"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                      <Phone className="h-3 w-3 md:h-4 md:w-4" />
                      Phone:
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                      <Mail className="h-3 w-3 md:h-4 md:w-4" />
                      Email:
                    </label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                      <Globe className="h-3 w-3 md:h-4 md:w-4" />
                      Website:
                    </label>
                    <input
                      type="url"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      placeholder="Enter website URL"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t mb-20 md:mb-0">
                  <Button
                    onClick={handleSaveNewCard}
                    disabled={isSaving}
                    className="w-full md:w-auto flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Card'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
