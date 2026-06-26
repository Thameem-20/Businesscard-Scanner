'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle, Camera, Building2, Phone, Mail, Globe, Save, FileWarning, PenLine, MapPin, Flag } from 'lucide-react';
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
  const [editFormData, setEditFormData] = useState<ExtractedData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ imageUrl: string; blobName: string } | null>(null);
  const [scanCountry, setScanCountry] = useState('');

  useEffect(() => {
    fetch('/api/settings/scan-country')
      .then((res) => res.json())
      .then((data) => setScanCountry(data.scanCountry || ''))
      .catch(() => {});
  }, []);

  // Check if extraction has meaningful data
  const hasExtractedData = (data: ExtractedData | null): boolean => {
    if (!data) return false;
    return !!(data.name || data.company || data.email || data.phone || data.jobTitle || data.website || data.address);
  };

  // Handle manual entry
  const handleEnterManually = () => {
    setExtractionFailed(false);
    setExtractedData({ rawText: '' });
    setEditFormData({ 
      name: '', 
      company: '', 
      jobTitle: '', 
      email: '', 
      phone: '', 
      address: '',
      website: '', 
      rawText: '',
      ...(pendingImage ? { imageUrl: pendingImage.imageUrl, blobName: pendingImage.blobName } : {})
    } as ExtractedData);
  };

  // Check for scan results from capture page
  useEffect(() => {
    const scanResult = sessionStorage.getItem('scanResult');
    if (scanResult) {
      try {
        const data = JSON.parse(scanResult);
        sessionStorage.removeItem('scanResult');
        
        // Set image preview if available
        if (data.imageUrl && data.blobName) {
          setPendingImage({ imageUrl: data.imageUrl, blobName: data.blobName });
        }

        if (data.imageDisplayUrl || data.imageUrl) {
          setImagePreview(data.imageDisplayUrl || data.imageUrl);
        }
        
        const extractedInfo = {
          ...data.extractedData,
          imageUrl: data.imageUrl,
          blobName: data.blobName,
        };
        
        if (!hasExtractedData(extractedInfo)) {
          setExtractionFailed(true);
          return;
        }
        
        if (data.duplicate) {
          setMatchedCard(data.matchedCard);
          setExtractedData(extractedInfo);
          setEditFormData(extractedInfo);
          setShowConfirm(true);
        } else if (data.extractedData) {
          setExtractedData(extractedInfo);
          setEditFormData(extractedInfo);
        }
      } catch (e) {
        console.error('Failed to parse scan result:', e);
      }
    }
  }, []);

  const processImageFile = useCallback(async (file: File) => {
    setError('');
    setUploading(true);
    setExtractedData(null);
    setMatchedCard(null);
    setShowConfirm(false);
    setEditFormData(null);
    setExtractionFailed(false);
    setPendingImage(null);

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

      const extractedInfo = {
        ...data.extractedData,
        imageUrl: data.imageUrl,
        blobName: data.blobName,
      };

      if (data.imageUrl && data.blobName) {
        setPendingImage({ imageUrl: data.imageUrl, blobName: data.blobName });
      }

      if (data.imageDisplayUrl) {
        setImagePreview(data.imageDisplayUrl);
      }
      
      if (!hasExtractedData(extractedInfo)) {
        setExtractionFailed(true);
        return;
      }

      if (data.duplicate) {
        setMatchedCard(data.matchedCard);
        setExtractedData(extractedInfo);
        setEditFormData(extractedInfo);
        setShowConfirm(true);
      } else {
        setExtractedData(extractedInfo);
        setEditFormData(extractedInfo);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await processImageFile(file);
  }, [processImageFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
  });

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
    e.target.value = '';
  }, [processImageFile]);

  // Open camera page
  const openCamera = () => {
    router.push('/dashboard/scan/capture');
  };

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

  const handleUpdate = async () => {
    if (!matchedCard || !extractedData) return;

    setUploading(true);
    try {
      const imageUrl = (extractedData as any).imageUrl;
      const blobName = (extractedData as any).blobName;
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: matchedCard.id,
          cardData: extractedData,
          imageUrl: imageUrl,
          blobName: blobName,
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
      const blobName = (extractedData as any).blobName;
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createNew: true,
          cardData: extractedData,
          imageUrl: imageUrl,
          blobName: blobName,
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
      const blobName = (editFormData as any).blobName;
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createNew: true,
          cardData: editFormData,
          imageUrl: imageUrl,
          blobName: blobName,
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
          {scanCountry ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-1.5">
              <Flag className="h-4 w-4" />
              Cards will be saved under: {scanCountry}
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
              No scan country set. Set one in Settings to categorize cards by country.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {!showConfirm && !extractedData && !uploading && !extractionFailed && (
            <div className="space-y-4">
              {/* Mobile: Camera button */}
              <div className="md:hidden">
                <div className="text-center py-8 px-4">
                  <button
                    onClick={openCamera}
                    className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-lg font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg"
                  >
                    <Camera className="h-6 w-6" />
                    Open Camera
                  </button>
                  <p className="text-gray-500 text-sm mt-4">
                    Position your business card within the frame
                  </p>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-gray-500 text-sm mb-3">Or upload from gallery</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      <span>Choose Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Desktop: Take Photo and Upload Options */}
              <div className="hidden md:block">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <button
                    onClick={openCamera}
                    className="flex flex-col items-center justify-center p-8 border-2 border-indigo-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                  >
                    <Camera className="h-12 w-12 text-indigo-600 mb-3" />
                    <p className="text-lg font-medium text-gray-900">Take Photo</p>
                    <p className="text-sm text-gray-500 mt-1">Use camera</p>
                  </button>
                  <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 text-gray-600 mb-3" />
                    <p className="text-lg font-medium text-gray-900">Upload Image</p>
                    <p className="text-sm text-gray-500 mt-1">Choose from device</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Supports: PNG, JPG, JPEG, GIF, WEBP
                </p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium mb-2">Processing image...</p>
              <p className="text-sm text-gray-500">Extracting contact information</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Extraction Failed */}
          {extractionFailed && !uploading && (
            <div className="py-8">
              {imagePreview && (
                <div className="mb-6 flex justify-center">
                  <div className="w-full max-w-md h-52 bg-gray-100 rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Business card" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <FileWarning className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Extract Data</h3>
                <p className="text-gray-600 mb-6">
                  We could not extract contact information from this image. The card may be unclear or in an unsupported format.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleEnterManually} className="flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    Enter Manually
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setExtractionFailed(false);
                      setImagePreview(null);
                    }}
                  >
                    Try Another Image
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Card Modal */}
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
                  A card with the name &quot;{extractedData?.name}&quot; already exists.
                </DialogDescription>
              </DialogHeader>

              {matchedCard && extractedData && (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Existing Card:</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {matchedCard.name}</p>
                      {matchedCard.company && <p><strong>Company:</strong> {matchedCard.company}</p>}
                      {matchedCard.email && <p><strong>Email:</strong> {matchedCard.email}</p>}
                      {matchedCard.phone && <p><strong>Phone:</strong> {matchedCard.phone}</p>}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">New Card:</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {extractedData.name}</p>
                      <p><strong>Company:</strong> {extractedData.company || 'Not detected'}</p>
                      {extractedData.jobTitle && <p><strong>Title:</strong> {extractedData.jobTitle}</p>}
                      <p><strong>Phone:</strong> {extractedData.phone || 'Not detected'}</p>
                      <p><strong>Email:</strong> {extractedData.email || 'Not detected'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleUpdate} disabled={uploading} className="flex-1">
                      {uploading ? 'Updating...' : 'Update Existing'}
                    </Button>
                    <Button onClick={handleCreateNew} disabled={uploading} variant="outline" className="flex-1">
                      Create New
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Results Form */}
          {extractedData && !showConfirm && editFormData && (
            <div className="mt-6 w-full">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center space-x-2">
                <CheckCircle className="text-green-600" size={20} />
                <p className="text-green-700 font-medium">Card scanned! Review and save.</p>
              </div>

              {imagePreview && (
                <div className="mb-4 flex justify-center">
                  <div className="w-full max-w-md h-52 bg-gray-100 rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Business card" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Extracted Information:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Full name:</label>
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Company:
                    </label>
                    <input
                      type="text"
                      value={editFormData.company || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Job Title:</label>
                    <input
                      type="text"
                      value={editFormData.jobTitle || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone:
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email:
                    </label>
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Address:
                    </label>
                    <textarea
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Website:
                    </label>
                    <input
                      type="text"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t pb-24 md:pb-0">
                  <Button onClick={handleSaveNewCard} disabled={isSaving} className="w-full md:w-auto flex items-center gap-2">
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
