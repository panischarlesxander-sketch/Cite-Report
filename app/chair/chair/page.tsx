'use client';

import { useState, useRef, useEffect } from 'react';
import ChairLayout from '@/components/ChairLayout';
import { Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { processSignature } from '@/lib/imageUtils';

export default function ChairSignaturePage() {
  const { user } = useAuth();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureSize, setSignatureSize] = useState<number>(100); // Percentage
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSignature = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('user')
          .select('signature_url, signature_size')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (data?.signature_url) {
          setSignatureUrl(data.signature_url);
        }
        if (data?.signature_size) {
          setSignatureSize(data.signature_size);
        }
      } catch (error) {
        console.error('Error fetching signature:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSignature();
  }, [user]);

  const saveSize = async (newSize: number) => {
    setSignatureSize(newSize);
    if (user) {
      await supabase
        .from('user')
        .update({ signature_size: newSize })
        .eq('id', user.id);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile || !user) return;

    setIsUploading(true);
    try {
      // Process the image locally to remove background
      const processedFile = await processSignature(originalFile);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration is missing');
      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `signatures/${user.id}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudinary error:', errorData);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      // Since we processed the image locally, we don't need Cloudinary background removal transformations
      // We just ensure it's served as PNG
      const newSignatureUrl = data.secure_url;

      // Update user profile with signature URL
      const { error } = await supabase
        .from('user')
        .update({ signature_url: newSignatureUrl })
        .eq('id', user.id);

      if (error) throw error;

      setSignatureUrl(newSignatureUrl);
      alert('E-Signature uploaded successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      console.error('Error uploading signature:', error);
      alert(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!user || !confirm('Are you sure you want to remove your E-Signature?')) return;

    try {
      const { error } = await supabase
        .from('user')
        .update({ signature_url: null })
        .eq('id', user.id);

      if (error) throw error;

      setSignatureUrl(null);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error removing signature:', error);
      alert(`Failed to remove signature: ${message}`);
    }
  };

  return (
    <ChairLayout title="E-Signature">
      <div className="max-w-3xl mx-auto">
        <div className="card-soft overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-600 px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">E-Signature Profile</h2>
              <p className="text-blue-100 text-xs mt-0.5">Your signature is applied to WFH reports you review and approve.</p>
            </div>
          </div>
          
          <div className="p-8 flex flex-col items-center">
            {loading ? (
              <div className="animate-pulse h-32 w-64 bg-gray-100 rounded-lg mb-4" />
            ) : signatureUrl ? (
              <div className="mb-8 relative group w-full max-w-sm">
                <div 
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 overflow-hidden relative transition-all duration-700 flex items-center justify-center min-h-[200px] bg-gray-50"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc 25%, transparent 25%, transparent 75%, #f8fafc 75%, #f8fafc), repeating-linear-gradient(45deg, #f8fafc 25%, #ffffff 25%, #ffffff 75%, #f8fafc 75%, #f8fafc)',
                    backgroundPosition: '0 0, 10px 10px',
                    backgroundSize: '20px 20px'
                  }}
                >
                  <img 
                    src={signatureUrl} 
                    alt="E-Signature" 
                    style={{ width: `${signatureSize}%`, maxWidth: '100%' }}
                    className="object-contain drop-shadow-md animate-in fade-in zoom-in duration-500 mix-blend-multiply"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[200%] animate-[scan_3s_ease-in-out_infinite] opacity-50 pointer-events-none mix-blend-overlay" />
                </div>

                <div className="mt-4 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signature Size: {signatureSize}%</label>
                  <input
                    type="range"
                    min="20"
                    max="150"
                    value={signatureSize}
                    onChange={(e) => saveSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Replace
                  </button>
                  <button 
                    onClick={handleRemove}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300 border border-gray-200">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No Signature Uploaded</h3>
                <p className="text-sm text-gray-500 mb-6">Upload a clear image of your signature (PNG recommended)</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary-soft px-8 py-3"
                >
                  Upload Signature
                </button>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleUpload}
              accept="image/*"
              className="hidden"
            />

            {isUploading && (
              <div className="mt-8 flex flex-col items-center gap-3 text-blue-600 font-semibold animate-pulse w-full max-w-sm">
                <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full w-full animate-[shimmer_1.5s_infinite]" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Processing transparent background...
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-6 border-t border-gray-200">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">How it works</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  This signature is applied to WFH accomplishment reports you review and approve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChairLayout>
  );
}
