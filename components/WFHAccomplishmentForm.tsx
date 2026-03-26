import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Plus, X, Printer, Calendar, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { UserRole } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { processSignature } from '@/lib/imageUtils';
import ReportImageViewer from '@/components/ReportImageViewer';
import Portal from '@/components/Portal';
import LottiePlayer from '@/components/LottiePlayer';
import PaperPlaneButton from '@/components/PaperPlaneButton';

interface BulletPoint {
  id: string;
  content: string;
}

interface InstructionItem {
  id: string;
  title: string;
  bullets: BulletPoint[];
}

interface ReportEntry {
  id: string;
  title: string;
  instruction_items: InstructionItem[];
  instruction_bullets: BulletPoint[];
  date: string;
  accomplishments: BulletPoint[];
  issues: BulletPoint[];
}

const AutoHeightTextarea = ({ value, onChange, className = '', placeholder = '' }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, placeholder?: string }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent border-none focus:ring-0 p-0 text-inherit font-inherit ${className}`}
      rows={1}
    />
  );
};

const FormattedDateInput = ({ value, onChange, className = '', underline = false }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, underline?: boolean }) => {
  const dateObj = value ? new Date(value) : null;
  const formattedDate = dateObj && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : value;

  return (
    <div className={`relative flex items-center justify-center group ${className}`}>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
      />
      <div className={`flex items-center justify-center gap-2 px-2 py-0.5 min-w-[120px] text-center ${underline ? 'border-b border-black' : 'border border-gray-200 rounded bg-white'}`}>
        <span className="text-black font-medium">{formattedDate || 'Select Date'}</span>
        <Calendar className="w-3.5 h-3.5 text-gray-400 print:hidden" />
      </div>
    </div>
  );
};

const ReportEntryRow = ({ 
  entry, 
  onUpdate, 
  onRemove, 
  onAddBullet, 
  onRemoveBullet, 
  onUpdateBullet,
  onAddInstructionItem,
  onRemoveInstructionItem,
  onUpdateInstructionTitle,
  onAddInstructionBullet,
  onRemoveInstructionBullet,
  onUpdateInstructionBullet,
  readOnly,
  showMainTitle = true
}: { 
  entry: ReportEntry, 
  onUpdate: (id: string, field: keyof ReportEntry, value: string) => void,
  onRemove: (id: string) => void,
  onAddBullet: (id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets') => void,
  onRemoveBullet: (id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string) => void,
  onUpdateBullet: (id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string, content: string) => void,
  onAddInstructionItem: (id: string) => void,
  onRemoveInstructionItem: (id: string, itemId: string) => void,
  onUpdateInstructionTitle: (id: string, itemId: string, title: string) => void,
  onAddInstructionBullet: (id: string, itemId: string) => void,
  onRemoveInstructionBullet: (id: string, itemId: string, bulletId: string) => void,
  onUpdateInstructionBullet: (id: string, itemId: string, bulletId: string, content: string) => void,
  readOnly?: boolean,
  showMainTitle?: boolean
}) => {
  return (
    <tr className="border-b border-black group/row">
      {/* Title/Instruction Column */}
      <td className="border-r-2 border-black p-1 align-top relative">
        <div className="flex flex-col gap-2">
          {/* Main Title - ONLY if not "Others" */}
          {showMainTitle && entry.title !== 'Others' && (
            <div className="flex items-start gap-2">
              {!readOnly ? (
                <AutoHeightTextarea 
                  value={entry.title} 
                  onChange={(e) => onUpdate(entry.id, 'title', e.target.value)} 
                  className="font-bold print:hidden placeholder:text-slate-300"
                  placeholder=""
                />
              ) : (
                <div className="font-bold whitespace-pre-wrap">{entry.title}</div>
              )}
              {!readOnly && (
                <>
                  <div className="hidden print:block font-bold whitespace-pre-wrap">{entry.title}</div>
                  <button 
                    type="button"
                    onClick={() => onRemove(entry.id)}
                    className="print:hidden text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          )}
          {!readOnly && !showMainTitle && entry.title !== 'Others' && (
            <div className="flex justify-end print:hidden">
              <button 
                type="button"
                onClick={() => onRemove(entry.id)}
                className="text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {entry.title === 'Others' && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">Others</span>
              {!readOnly && (
                <button 
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  className="print:hidden text-red-400 hover:text-red-600 opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Instruction Items (Title -> Bullets) */}
          <div className="space-y-3 mt-1 pl-2 border-l border-gray-100">
            {entry.instruction_items?.map((item) => (
              <div key={item.id} className="space-y-1 group/item">
                <div className="flex items-center gap-2">
                  {!readOnly ? (
                    <AutoHeightTextarea 
                      value={item.title} 
                      onChange={(e) => onUpdateInstructionTitle(entry.id, item.id, e.target.value)}
                      className="font-semibold text-gray-700 print:hidden placeholder:text-slate-300"
                      placeholder="Title..."
                    />
                  ) : (
                    <div className="font-semibold">{item.title}</div>
                  )}
                  {!readOnly && (
                    <>
                      <div className="hidden print:block font-semibold">{item.title}</div>
                      <button 
                        type="button"
                        onClick={() => onRemoveInstructionItem(entry.id, item.id)}
                        className="print:hidden text-red-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                </div>
                <div className="space-y-1 pl-2">
                  {item.bullets.map((bullet) => (
                    <div key={bullet.id} className="flex items-baseline gap-1 group/bullet">
                      <span className="leading-none">•</span>
                      {!readOnly ? (
                        <AutoHeightTextarea 
                          value={bullet.content} 
                          onChange={(e) => onUpdateInstructionBullet(entry.id, item.id, bullet.id, e.target.value)}
                          className="print:hidden"
                          placeholder="..."
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">{bullet.content}</div>
                      )}
                      {!readOnly && (
                        <>
                          <div className="hidden print:block whitespace-pre-wrap">{bullet.content}</div>
                          <button 
                            type="button"
                            onClick={() => onRemoveInstructionBullet(entry.id, item.id, bullet.id)}
                            className="print:hidden text-gray-300 hover:text-red-400 opacity-0 group-hover/bullet:opacity-100 shrink-0"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {!readOnly && (
                    <button 
                      type="button"
                      onClick={() => onAddInstructionBullet(entry.id, item.id)}
                      className="print:hidden text-blue-400 hover:text-blue-600 text-[9px] font-bold flex items-center gap-1"
                    >
                      <Plus className="w-2 h-2" /> Add Bullet
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <div className="flex items-center gap-3 mt-1">
                <button 
                  type="button"
                  onClick={() => onAddInstructionItem(entry.id)}
                  className="print:hidden text-blue-500 hover:text-blue-700 text-[10px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5" /> Add Title
                </button>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Date Column */}
      <td className="border-r-2 border-black p-1 align-top text-center">
        {!readOnly ? (
          <div className="print:hidden">
            <FormattedDateInput 
              value={entry.date} 
              onChange={(e) => onUpdate(entry.id, 'date', e.target.value)} 
              className="mx-auto"
            />
          </div>
        ) : null}
        <div className={`${!readOnly ? 'hidden print:block' : ''} text-center`}>
          {entry.date ? new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
        </div>
      </td>

      {/* Accomplishments Column */}
      <td className="border-r-2 border-black p-1 align-top">
        <div className="space-y-1">
          {entry.accomplishments.map((bullet) => (
            <div key={bullet.id} className="flex items-baseline gap-1 group/bullet">
              <span className="leading-none">•</span>
              {!readOnly ? (
                <AutoHeightTextarea 
                  value={bullet.content} 
                  onChange={(e) => onUpdateBullet(entry.id, 'accomplishments', bullet.id, e.target.value)}
                  className="print:hidden"
                />
              ) : (
                <div className="whitespace-pre-wrap">{bullet.content}</div>
              )}
              {!readOnly && (
                <>
                  <div className="hidden print:block whitespace-pre-wrap">{bullet.content}</div>
                  <button 
                    type="button"
                    onClick={() => onRemoveBullet(entry.id, 'accomplishments', bullet.id)}
                    className="print:hidden text-gray-300 hover:text-red-400 opacity-0 group-hover/bullet:opacity-100 shrink-0"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {!readOnly && (
            <button 
              type="button"
              onClick={() => onAddBullet(entry.id, 'accomplishments')}
              className="print:hidden text-green-600 hover:text-green-700 text-[10px] font-bold flex items-center gap-1"
            >
              <Plus className="w-2.5 h-2.5" /> Add Bullet
            </button>
          )}
        </div>
      </td>

      {/* Issues/Concerns Column */}
      <td className="p-1 align-top pr-8">
        <div className="space-y-1">
          {entry.issues.map((bullet) => (
            <div key={bullet.id} className="flex items-baseline gap-1 group/bullet">
              <span className="leading-none">•</span>
              {!readOnly ? (
                <AutoHeightTextarea 
                  value={bullet.content} 
                  onChange={(e) => onUpdateBullet(entry.id, 'issues', bullet.id, e.target.value)}
                  className="print:hidden"
                />
              ) : (
                <div className="whitespace-pre-wrap">{bullet.content}</div>
              )}
              {!readOnly && (
                <>
                  <div className="hidden print:block whitespace-pre-wrap">{bullet.content}</div>
                  <button 
                    type="button"
                    onClick={() => onRemoveBullet(entry.id, 'issues', bullet.id)}
                    className="print:hidden text-gray-300 hover:text-red-400 opacity-0 group-hover/bullet:opacity-100 shrink-0"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </>
              )}
            </div>
          ))}
          {!readOnly && (
            <button 
              type="button"
              onClick={() => onAddBullet(entry.id, 'issues')}
              className="print:hidden text-green-600 hover:text-green-700 text-[10px] font-bold flex items-center gap-1"
            >
              <Plus className="w-2.5 h-2.5" /> Add Bullet
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

interface WFHAccomplishmentFormProps {
  initialData?: any;
  readOnly?: boolean;
  onApprove?: (data: any) => void;
  onReject?: (reason: string) => void;
  userRole?: string; // 'faculty', 'chair', 'dean'
  onExit?: () => void;
}

export default function WFHAccomplishmentForm({ initialData, readOnly = false, onApprove, onReject, userRole, onExit }: WFHAccomplishmentFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  
  // Basic Info State
  const [reportDate, setReportDate] = useState(initialData?.report_date || new Date().toISOString().split('T')[0]);
  const [reportTitle, setReportTitle] = useState(initialData?.title || '');
  const [college, setCollege] = useState(initialData?.college || 'INFORMATION TECHNOLOGY EDUCATION');
  const [department, setDepartment] = useState(initialData?.department || 'INFORMATION TECHNOLOGY');
  
  const position = initialData?.position || user?.position || 'INSTRUCTOR I';
  const [designations, setDesignations] = useState<string[]>(initialData?.designation ? initialData.designation.split(', ') : ['']);

  // Section specific dates
  const [sectionADate, setSectionADate] = useState(new Date().toISOString().split('T')[0]);
  const [sectionBDate, setSectionBDate] = useState(new Date().toISOString().split('T')[0]);
  const [sectionCDate, setSectionCDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Footer dates
  const [preparedDate, setPreparedDate] = useState(initialData?.prepared_date || new Date().toISOString().split('T')[0]);
  const [footerReviewedDate, setFooterReviewedDate] = useState(initialData?.reviewed_date || new Date().toISOString().split('T')[0]);
  const [footerApprovedDate, setFooterApprovedDate] = useState(initialData?.approved_date || new Date().toISOString().split('T')[0]);

  // Signature States
  const [chairSignature, setChairSignature] = useState('');
  const [deanSignature, setDeanSignature] = useState('');
  const [directorSignature, setDirectorSignature] = useState('');
  const [facultySignature, setFacultySignature] = useState('');
  const [chairSignatureSize, setChairSignatureSize] = useState(100);
  const [deanSignatureSize, setDeanSignatureSize] = useState(100);
  const [directorSignatureSize, setDirectorSignatureSize] = useState(100);
  const [facultySignatureSize, setFacultySignatureSize] = useState(100);

  // Signatories state
  const [deans, setDeans] = useState<{ id: string; first_name: string; last_name: string; signature_size?: number; signature_url?: string }[]>([]);
  const [chairs, setChairs] = useState<{ id: string; first_name: string; last_name: string; signature_size?: number; signature_url?: string }[]>([]);
  const [directors, setDirectors] = useState<{ id: string; first_name: string; last_name: string; signature_size?: number; signature_url?: string }[]>([]);
  const [selectedDean, setSelectedDean] = useState('');
  const [selectedChair, setSelectedChair] = useState('');
  const [selectedDirector, setSelectedDirector] = useState('');
  
  // Fetch current user's signature
  useEffect(() => {
    const fetchUserSignature = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('user')
          .select('signature_url, signature_size')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          if (data.signature_url) setFacultySignature(data.signature_url);
          if (data.signature_size) setFacultySignatureSize(data.signature_size);
        }
      } catch (err) {
        console.error('Error fetching user signature:', err);
      }
    };
    fetchUserSignature();
  }, [user]);

  // Update signature sizes based on selected signatories
  useEffect(() => {
    // If we have a signature URL, try to find the matching signer first
    if (chairSignature && chairs.length > 0) {
      const signer = chairs.find(c => c.signature_url === chairSignature);
      if (signer) {
        setSelectedChair(`${signer.first_name} ${signer.last_name}`);
        if (signer.signature_size) setChairSignatureSize(signer.signature_size);
        return;
      }
    }
    
    // Fallback to selected name lookup
    if (selectedChair && chairs.length > 0) {
      const chair = chairs.find(c => `${c.first_name} ${c.last_name}` === selectedChair);
      if (chair?.signature_size) {
        setChairSignatureSize(chair.signature_size);
      }
    }
  }, [selectedChair, chairs, chairSignature]);

  useEffect(() => {
    // If we have a signature URL, try to find the matching signer first
    if (deanSignature && deans.length > 0) {
      const signer = deans.find(d => d.signature_url === deanSignature);
      if (signer) {
        setSelectedDean(`${signer.first_name} ${signer.last_name}`);
        if (signer.signature_size) setDeanSignatureSize(signer.signature_size);
        return;
      }
    }

    // Fallback to selected name lookup
    if (selectedDean && deans.length > 0) {
      const dean = deans.find(d => `${d.first_name} ${d.last_name}` === selectedDean);
      if (dean?.signature_size) {
        setDeanSignatureSize(dean.signature_size);
      }
    }
  }, [selectedDean, deans, deanSignature]);

  useEffect(() => {
    if (selectedDirector && directors.length > 0) {
      const director = directors.find(d => `${d.first_name} ${d.last_name}` === selectedDirector);
      if (director?.signature_url) {
        setDirectorSignature(director.signature_url);
      }
      if (director?.signature_size) {
        setDirectorSignatureSize(director.signature_size);
      }
    }
  }, [selectedDirector, directors]);

  
  // Footer state
  const [attachments, setAttachments] = useState<string[]>(initialData?.attachments ? JSON.parse(initialData.attachments) : []);
  const [isUploading, setIsUploading] = useState(false);
  const [footerRemarks1, setFooterRemarks1] = useState(initialData?.footer_remarks_1 || '');
  const [footerRemarks2, setFooterRemarks2] = useState(initialData?.footer_remarks_2 || '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignatureUpload = async () => {
    // 1. Try to use stored signature first
    try {
      if (!user) return;
      
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('signature_url')
        .eq('id', user.id)
        .single();

      if (!userError && userData?.signature_url) {
        // Use stored signature
        if (onApprove) {
          onApprove({
            footer_remarks_1: footerRemarks1,
            footer_remarks_2: footerRemarks2,
            reviewed_date: footerReviewedDate,
            approved_date: footerApprovedDate,
            signature_url: userData.signature_url
          });
          setShowApproveModal(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error fetching stored signature:', err);
    }

    // 2. If no stored signature or explicit upload requested
    if (!signatureFile || !onApprove) return;

    setIsUploadingSignature(true);
    try {
      // Process the image locally to remove background
      const processedFile = await processSignature(signatureFile);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration is missing');
      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `signatures/${user?.id}`);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      // Since we processed the image locally, we don't need Cloudinary background removal transformations
      // We just ensure it's served as PNG
      const signatureUrl = data.secure_url;

      // Update user profile with signature URL so it's used for future approvals
      if (user) {
        await supabase
          .from('user')
          .update({ signature_url: signatureUrl })
          .eq('id', user.id);
      }

      // Pass the signature URL to the onApprove callback
      onApprove({
        footer_remarks_1: footerRemarks1,
        footer_remarks_2: footerRemarks2,
        reviewed_date: footerReviewedDate,
        approved_date: footerApprovedDate,
        signature_url: signatureUrl
      });
      
      setShowApproveModal(false);
      setSignatureFile(null);
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      alert(`Error uploading signature: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: string[] = [...attachments];

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary configuration is missing');
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `attachments/${user?.id}`);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Upload failed');
        }

        const data = await response.json();
        newAttachments.push(data.secure_url);
      }
      setAttachments(newAttachments);
    } catch (error: any) {
      console.error('Error uploading to Cloudinary:', error);
      alert(`Error uploading image: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  useEffect(() => {
    let mounted = true;
    
    const fetchSignatories = async () => {
      try {
        const { data: deansData, error: deansError } = await supabase
          .from('user')
          .select('id, first_name, last_name, signature_size, signature_url')
          .eq('role', 'dean');
        if (deansError) throw deansError;
        if (deansData && deansData.length > 0 && mounted) {
          setDeans(deansData);
          // Default to first dean if no signature present
          if (!deanSignature) {
            setSelectedDean(`${deansData[0].first_name} ${deansData[0].last_name}`);
          }
        }

        const { data: chairsData, error: chairsError } = await supabase
          .from('user')
          .select('id, first_name, last_name, signature_size, signature_url')
          .eq('role', 'chair');
        if (chairsError) throw chairsError;
        if (chairsData && chairsData.length > 0 && mounted) {
          setChairs(chairsData);
          // Default to first chair if no signature present
          if (!chairSignature) {
            setSelectedChair(`${chairsData[0].first_name} ${chairsData[0].last_name}`);
          }
        }


        const { data: directorsData, error: directorsError } = await supabase
          .from('user')
          .select('id, first_name, last_name, signature_url, signature_size')
          .eq('role', 'director');
        if (directorsError) throw directorsError;
        if (directorsData && directorsData.length > 0 && mounted) {
          setDirectors(directorsData);
          setSelectedDirector(`${directorsData[0].first_name} ${directorsData[0].last_name}`);
        }

      } catch (error) {
        if (mounted) {
          const errorObj = error instanceof Error ? { message: error.message, stack: error.stack } : error;
          console.error('Detailed error fetching signatories:', errorObj);
        }
      }
    };

    fetchSignatories();
    
    return () => {
      mounted = false;
    };
  }, []);

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      console.error("Print dialog failed:", error);
    }
  };

  // Hydrate state from initialData
  useEffect(() => {
    if (initialData && initialData.wfh_entries) {
      const mapEntry = (dbEntry: any): ReportEntry => ({
        id: dbEntry.id,
        title: dbEntry.title,
        date: dbEntry.entry_date || dbEntry.date, // Handle both just in case, but prefer entry_date
        instruction_items: dbEntry.wfh_instruction_items?.map((item: any) => ({
          id: item.id,
          title: item.title,
          bullets: item.wfh_instruction_bullets?.map((b: any) => ({ id: b.id, content: b.content })) || []
        })) || [],
        instruction_bullets: [],
        accomplishments: dbEntry.wfh_accomplishments?.map((b: any) => ({ id: b.id, content: b.content })) || [],
        issues: dbEntry.wfh_issues?.map((b: any) => ({ id: b.id, content: b.content })) || []
      });

      const entriesA = initialData.wfh_entries.filter((e: any) => e.section === 'A');
      const entriesB = initialData.wfh_entries.filter((e: any) => e.section === 'B');
      const entriesC = initialData.wfh_entries.filter((e: any) => e.section === 'C');

      setSectionA(entriesA.filter((e: any) => e.title !== 'Others').map(mapEntry));
      setOthersA(entriesA.filter((e: any) => e.title === 'Others').map(mapEntry));
      if (entriesA.length > 0) {
        setRemarksA(entriesA[0].remarks || '');
        if (entriesA[0].approved_date) setSectionADate(entriesA[0].approved_date);
      }

      setSectionB(entriesB.filter((e: any) => e.title !== 'Others').map(mapEntry));
      setOthersB(entriesB.filter((e: any) => e.title === 'Others').map(mapEntry));
      if (entriesB.length > 0) {
        setRemarksB(entriesB[0].remarks || '');
        if (entriesB[0].approved_date) setSectionBDate(entriesB[0].approved_date);
      }

      setSectionC(entriesC.map(mapEntry));
      if (entriesC.length > 0) {
        setRemarksC(entriesC[0].remarks || '');
        if (entriesC[0].approved_date) setSectionCDate(entriesC[0].approved_date);
      }
      
      // Load signatures if present in initialData
      if (initialData.chair_signature) setChairSignature(initialData.chair_signature);
      if (initialData.dean_signature) setDeanSignature(initialData.dean_signature);
    }
  }, [initialData]);

  const createInitialEntry = (): ReportEntry => ({
    id: crypto.randomUUID(),
    title: '',
    instruction_items: [],
    instruction_bullets: [],
    date: new Date().toISOString().split('T')[0],
    accomplishments: [],
    issues: []
  });

  const createInitialOthersEntry = (): ReportEntry => ({
    id: crypto.randomUUID(),
    title: 'Others',
    instruction_items: [],
    instruction_bullets: [],
    date: new Date().toISOString().split('T')[0],
    accomplishments: [{ id: crypto.randomUUID(), content: '' }],
    issues: [{ id: crypto.randomUUID(), content: '' }]
  });

  // Entries State for each section
  const [sectionA, setSectionA] = useState<ReportEntry[]>([]);
  const [othersA, setOthersA] = useState<ReportEntry[]>([]);
  const [remarksA, setRemarksA] = useState('');

  const [sectionB, setSectionB] = useState<ReportEntry[]>([]);
  const [othersB, setOthersB] = useState<ReportEntry[]>([]);
  const [remarksB, setRemarksB] = useState('');

  const [sectionC, setSectionC] = useState<ReportEntry[]>([]);
  const [remarksC, setRemarksC] = useState('');


  // Auto-save section remarks for chair/dean review
  const saveSectionRemarks = async (section: 'A' | 'B' | 'C', value: string) => {
    if (!initialData?.wfh_entries) return;
    const sectionEntries = (initialData.wfh_entries as any[]).filter((e: any) => e.section === section);
    if (sectionEntries.length > 0) {
      await supabase.from('wfh_entries').update({ remarks: value }).eq('id', sectionEntries[0].id);
    }
  };

  // --- State Management Handlers ---
  const getSectionApi = (section: 'A' | 'B' | 'C') => {
    if (section === 'A') return { entries: sectionA, setter: setSectionA };
    if (section === 'B') return { entries: sectionB, setter: setSectionB };
    return { entries: sectionC, setter: setSectionC };
  };

  const addEntryRow = (section: 'A' | 'B' | 'C') => {
    const { entries, setter } = getSectionApi(section);
    setter([...entries, createInitialEntry()]);
  };

  const removeEntryRow = (section: 'A' | 'B' | 'C', id: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.filter(e => e.id !== id));
  };

  const updateEntryField = (section: 'A' | 'B' | 'C', id: string, field: keyof ReportEntry, value: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addBulletPoint = (section: 'A' | 'B' | 'C', id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets') => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === id) {
        return { ...e, [type]: [...(e[type] as BulletPoint[]), { id: crypto.randomUUID(), content: '' }] };
      }
      return e;
    }));
  };

  const removeBulletPoint = (section: 'A' | 'B' | 'C', id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === id) {
        return { ...e, [type]: (e[type] as BulletPoint[]).filter(b => b.id !== bulletId) };
      }
      return e;
    }));
  };

  const updateBulletPoint = (section: 'A' | 'B' | 'C', id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string, content: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === id) {
        return { ...e, [type]: (e[type] as BulletPoint[]).map(b => b.id === bulletId ? { ...b, content } : b) };
      }
      return e;
    }));
  };

  // Instruction Item Handlers
  const addInstructionItem = (section: 'A' | 'B' | 'C', entryId: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        const newItem: InstructionItem = { id: crypto.randomUUID(), title: '', bullets: [] };
        return { ...e, instruction_items: [...(e.instruction_items || []), newItem] };
      }
      return e;
    }));
  };

  const removeInstructionItem = (section: 'A' | 'B' | 'C', entryId: string, itemId: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, instruction_items: e.instruction_items.filter(i => i.id !== itemId) };
      }
      return e;
    }));
  };

  const updateInstructionTitle = (section: 'A' | 'B' | 'C', entryId: string, itemId: string, title: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, instruction_items: e.instruction_items.map(i => i.id === itemId ? { ...i, title } : i) };
      }
      return e;
    }));
  };

  const addInstructionBullet = (section: 'A' | 'B' | 'C', entryId: string, itemId: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          instruction_items: e.instruction_items.map(i => 
            i.id === itemId ? { ...i, bullets: [...i.bullets, { id: crypto.randomUUID(), content: '' }] } : i
          )
        };
      }
      return e;
    }));
  };

  const removeInstructionBullet = (section: 'A' | 'B' | 'C', entryId: string, itemId: string, bulletId: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          instruction_items: e.instruction_items.map(i => 
            i.id === itemId ? { ...i, bullets: i.bullets.filter(b => b.id !== bulletId) } : i
          )
        };
      }
      return e;
    }));
  };

  const updateInstructionBullet = (section: 'A' | 'B' | 'C', entryId: string, itemId: string, bulletId: string, content: string) => {
    const { entries, setter } = getSectionApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          instruction_items: e.instruction_items.map(i => 
            i.id === itemId ? { ...i, bullets: i.bullets.map(b => b.id === bulletId ? { ...b, content } : b) } : i
          )
        };
      }
      return e;
    }));
  };

  // --- State Management for "Others" Entries ---
  const getOthersApi = (section: 'A' | 'B') => {
    if (section === 'A') return { entries: othersA, setter: setOthersA };
    return { entries: othersB, setter: setOthersB };
  };

  const addOthersEntry = (section: 'A' | 'B') => {
    const { entries, setter } = getOthersApi(section);
    setter([...entries, createInitialOthersEntry()]);
  };

  const removeOthersEntry = (section: 'A' | 'B', entryId: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.filter(e => e.id !== entryId));
  };

  const updateOthersField = (section: 'A' | 'B', entryId: string, field: keyof ReportEntry, value: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => e.id === entryId ? { ...e, [field]: value } : e));
  };

  const addOthersBullet = (section: 'A' | 'B', entryId: string, type: 'accomplishments' | 'issues' | 'instruction_bullets') => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, [type]: [...(e[type] as BulletPoint[] || []), { id: crypto.randomUUID(), content: '' }] };
      }
      return e;
    }));
  };

  const removeOthersBullet = (section: 'A' | 'B', entryId: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, [type]: (e[type] as BulletPoint[]).filter(b => b.id !== bulletId) };
      }
      return e;
    }));
  };

  const updateOthersBullet = (section: 'A' | 'B', entryId: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string, content: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, [type]: (e[type] as BulletPoint[]).map(b => b.id === bulletId ? { ...b, content } : b) };
      }
      return e;
    }));
  };

  // Others Instruction Item Handlers
  const addOthersInstructionItem = (section: 'A' | 'B', entryId: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        const newItem: InstructionItem = { id: crypto.randomUUID(), title: '', bullets: [{ id: crypto.randomUUID(), content: '' }] };
        return { ...e, instruction_items: [...(e.instruction_items || []), newItem] };
      }
      return e;
    }));
  };

  const removeOthersInstructionItem = (section: 'A' | 'B', entryId: string, itemId: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, instruction_items: e.instruction_items.filter(i => i.id !== itemId) };
      }
      return e;
    }));
  };

  const updateOthersInstructionTitle = (section: 'A' | 'B', entryId: string, itemId: string, title: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return { ...e, instruction_items: e.instruction_items.map(i => i.id === itemId ? { ...i, title } : i) };
      }
      return e;
    }));
  };

  const addOthersInstructionBullet = (section: 'A' | 'B', entryId: string, itemId: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          instruction_items: e.instruction_items.map(i => 
            i.id === itemId ? { ...i, bullets: [...i.bullets, { id: crypto.randomUUID(), content: '' }] } : i
          )
        };
      }
      return e;
    }));
  };

  const removeOthersInstructionBullet = (section: 'A' | 'B', entryId: string, itemId: string, bulletId: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          instruction_items: e.instruction_items.map(i => 
            i.id === itemId ? { ...i, bullets: i.bullets.filter(b => b.id !== bulletId) } : i
          )
        };
      }
      return e;
    }));
  };

  const updateOthersInstructionBullet = (section: 'A' | 'B', entryId: string, itemId: string, bulletId: string, content: string) => {
    const { entries, setter } = getOthersApi(section);
    setter(entries.map(e => {
      if (e.id === entryId) {
        return {
          ...e,
          instruction_items: e.instruction_items.map(i => 
            i.id === itemId ? { ...i, bullets: i.bullets.map(b => b.id === bulletId ? { ...b, content } : b) } : i
          )
        };
      }
      return e;
    }));
  };

  /* --- Print Styles --- */
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: A4;
          margin: 1cm;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleApproveClick = async () => {
    // 0. Enforce Sequential Approval
    if (userRole === 'dean') {
      // Check if Chair has approved yet. 
      // We can check if chairSignature is present or if initialData.status is 'Reviewed'
      // Using chairSignature is a good visual check, but initialData.status is the source of truth for workflow.
      // However, initialData might be stale if we don't refresh, but let's assume we have decent data.
      // Better: check if chairSignature is present in the form state (which comes from DB).
      
      if (!chairSignature && initialData?.status !== 'Reviewed') {
        alert("Action Required: This report must be approved by the Department Chair before the Dean can approve it.");
        return;
      }
    }

    // 1. Try to fetch stored signature
    if (!user) return;
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('signature_url, signature_size')
        .eq('id', user.id)
        .single();

      if (!userError && userData?.signature_url) {
        // Signature exists, proceed to approve directly
        if (onApprove) {
          onApprove({
            footer_remarks_1: footerRemarks1,
            footer_remarks_2: footerRemarks2,
            reviewed_date: footerReviewedDate,
            approved_date: footerApprovedDate,
            signature_url: userData.signature_url
          });
        }
      } else {
        // No signature found, show modal to upload
        setShowApproveModal(true);
      }
    } catch (err) {
      console.error('Error checking signature:', err);
      // Fallback to modal in case of error
      setShowApproveModal(true);
    }
  };

  const handleSubmit = async () => {
    if (readOnly) return; // Prevent submission in read-only mode
    if (!user) return;
    setLoading(true);

    try {
      let reportId = initialData?.id;

      if (reportId) {
        // UPDATE existing report
        const { error: updateError } = await supabase
          .from('wfh_reports')
          .update({ 
            report_date: reportDate, 
            title: reportTitle,
            college, 
            department, 
            faculty_name: user.name, 
            position, 
            designation: designations.filter(d => d.trim()).join(', '),
            prepared_date: preparedDate,
            reviewed_date: footerReviewedDate,
            approved_date: footerApprovedDate,
            attachments: JSON.stringify(attachments),
            footer_remarks_1: footerRemarks1,
            footer_remarks_2: footerRemarks2
          })
          .eq('id', reportId);

        if (updateError) throw updateError;

        // Fetch existing entries to perform cascading delete
        const { data: existingEntries } = await supabase
          .from('wfh_entries')
          .select('id')
          .eq('report_id', reportId);

        if (existingEntries && existingEntries.length > 0) {
          const entryIds = existingEntries.map(e => e.id);
          
          // 1. Delete instruction bullets (deepest level)
          // First get items to get their IDs
          const { data: existingItems } = await supabase
            .from('wfh_instruction_items')
            .select('id')
            .in('entry_id', entryIds);
            
          if (existingItems && existingItems.length > 0) {
            const itemIds = existingItems.map(i => i.id);
            await supabase.from('wfh_instruction_bullets').delete().in('item_id', itemIds);
          }

          // 2. Delete instruction items
          await supabase.from('wfh_instruction_items').delete().in('entry_id', entryIds);

          // 3. Delete standard bullets
          await supabase.from('wfh_accomplishments').delete().in('entry_id', entryIds);
          await supabase.from('wfh_issues').delete().in('entry_id', entryIds);

          // 4. Delete entries
          const { error: deleteError } = await supabase
            .from('wfh_entries')
            .delete()
            .in('id', entryIds); // Delete by ID to be safe
          
          if (deleteError) throw deleteError;
        }

      } else {
        // INSERT new report
        const { data: report, error: reportError } = await supabase
          .from('wfh_reports')
          .insert({ 
            user_id: parseInt(user.id), 
            report_date: reportDate, 
            title: reportTitle,
            college, 
            department, 
            faculty_name: user.name, 
            position, 
            designation: designations.filter(d => d.trim()).join(', '),
            prepared_date: preparedDate,
            reviewed_date: footerReviewedDate,
            approved_date: footerApprovedDate,
            attachments: JSON.stringify(attachments),
            footer_remarks_1: footerRemarks1,
            footer_remarks_2: footerRemarks2
          })
          .select()
          .single();

        if (reportError) throw reportError;
        reportId = report.id;
      }

      const processSection = async (sectionLetter: string, entries: ReportEntry[], sectionRemarks: string, othersEntries: ReportEntry[] = [], approvedDate?: string) => {
        const allEntries = [...entries, ...othersEntries];

        for (const entry of allEntries) {
          if (!entry.title && entry.accomplishments.every(b => !b.content) && entry.issues.every(b => !b.content)) continue;

          const { data: entryData, error: entryError } = await supabase
            .from('wfh_entries')
            .insert({
              report_id: reportId,
              section: sectionLetter,
              title: entry.title,
              entry_date: entry.date,
              remarks: sectionRemarks,
              approved_date: approvedDate
            })
            .select()
            .single();

          if (entryError) throw entryError;

          // Save accomplishments
          const accomplishments = entry.accomplishments.filter(b => b.content);
          if (accomplishments.length > 0) {
            await supabase.from('wfh_accomplishments').insert(
              accomplishments.map(b => ({ entry_id: entryData.id, content: b.content }))
            );
          }

          // Save issues
          const issues = entry.issues.filter(b => b.content);
          if (issues.length > 0) {
            await supabase.from('wfh_issues').insert(
              issues.map(b => ({ entry_id: entryData.id, content: b.content }))
            );
          }

          // Save instruction items (if any)
          if (entry.instruction_items && entry.instruction_items.length > 0) {
            for (const item of entry.instruction_items) {
              if (!item.title && item.bullets.every(b => !b.content)) continue;
              
              const { data: itemData, error: itemError } = await supabase
                .from('wfh_instruction_items')
                .insert({
                  entry_id: entryData.id,
                  title: item.title
                })
                .select()
                .single();

              if (itemError) throw itemError;

              const itemBullets = item.bullets.filter(b => b.content);
              if (itemBullets.length > 0) {
                await supabase.from('wfh_instruction_bullets').insert(
                  itemBullets.map(b => ({ item_id: itemData.id, content: b.content }))
                );
              }
            }
          }
        }
      };

      await processSection('A', sectionA, remarksA, othersA, sectionADate);
      await processSection('B', sectionB, remarksB, othersB, sectionBDate);
      await processSection('C', sectionC, remarksC, [], sectionCDate);

      // Success modal will be shown after plane animation completes
    } catch (error: any) {
      console.error('Error submitting report:', error);
      alert(`Failed to submit report: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-sm overflow-hidden border border-gray-200 my-8 print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-none print:w-full">
      {/* Header Actions */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-8 py-4 border-b border-gray-700 flex justify-between items-center print:hidden">
        <h2 className="text-base font-bold text-white tracking-wide">WFH Accomplishment Report <span className="text-gray-300 font-medium text-sm">{readOnly ? '— Review Mode' : '— Editor'}</span></h2>
        <div className="flex gap-3">
          {initialData && readOnly && (
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium">
              <Printer className="w-4 h-4" /> Print PDF
            </button>
          )}
          {!readOnly && (
            <PaperPlaneButton onSubmit={handleSubmit} onSuccess={() => setShowSubmitSuccess(true)} disabled={loading} submitting={loading} />
          )}
        </div>
      </div>

      {/* Action Buttons for Chair/Dean (Fixed Overlay) */}
      {readOnly && (userRole === 'chair' || userRole === 'dean') && (
        <div className="fixed bottom-8 right-8 flex gap-4 print:hidden z-50">
          <button
            onClick={() => setShowRejectModal(true)}
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <X className="w-5 h-5" /> Reject
          </button>
          <button
            onClick={handleApproveClick}
            disabled={userRole === 'dean' && !chairSignature && initialData?.status !== 'Reviewed'}
            className={`px-6 py-3 font-bold rounded-full shadow-lg transition-colors flex items-center gap-2 ${
              userRole === 'dean' && !chairSignature && initialData?.status !== 'Reviewed'
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" /> Approve
          </button>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Report</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejecting this report.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl mb-6 h-32 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              placeholder="Enter rejection reason..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onReject) onReject(rejectionReason);
                  setShowRejectModal(false);
                }}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal (for uploading signature if not set) */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Approve Report</h3>
            <p className="text-gray-600 mb-4">
              You do not have a saved E-Signature. Please upload one to proceed.
              Future approvals will use this signature automatically.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Signature (Image)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {signatureFile ? (
                      <p className="text-sm text-green-600 font-semibold">{signatureFile.name}</p>
                    ) : (
                      <>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">PNG, JPG (Transparent background recommended)</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSignatureFile(null);
                }}
                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSignatureUpload}
                disabled={!signatureFile || isUploadingSignature}
                className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isUploadingSignature ? 'Uploading...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-8 font-serif text-[10px] leading-tight text-black overflow-x-auto print:p-0 print:overflow-visible">
        {/* Separate Header Table for tight logo cell */}
        <table className="w-full border-collapse border-2 border-black text-[11px] mb-2">
          <tbody>
            <tr>
              <td rowSpan={2} className="p-3 w-32 border-r-2 border-black border-b-2 align-middle text-center">
                <Image src="/nvsulogo.svg" alt="NVSU Logo" width={80} height={80} className="w-20 h-20 mx-auto" />
              </td>
              <td className="p-1 text-center align-middle border-b-2 border-black">
                <div className="text-[10px] leading-tight">
                  <p>Republic of the Philippines</p>
                  <p className="font-bold">NUEVA VIZCAYA STATE UNIVERSITY</p>
                  <p>Bayombong, Nueva Vizcaya</p>
                </div>
              </td>
            </tr>
            <tr>
              <td className="p-1.5 text-center align-middle border-b-2 border-black font-bold text-[11px] leading-tight uppercase">
                Asynchronous Learning Accomplishment Report for Faculty
              </td>
            </tr>
          </tbody>
        </table>

        {/* Report Title Row */}
        <div className="mb-4 px-1 print:hidden">
          <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Report Title:</label>
          {!readOnly ? (
            <input 
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full border-b-2 border-black outline-none py-1 bg-transparent font-bold text-[12px] placeholder:text-gray-300"
              placeholder="Enter Report Title (e.g., Accomplishment Report for March 2026)"
            />
          ) : (
            <div className="font-bold text-[12px] border-b-2 border-black py-1">{reportTitle || 'Untitled Report'}</div>
          )}
        </div>

        {/* Date row (separate from table but visually close) */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="font-bold text-[11px]">Date:</span>
          {!readOnly ? (
            <div className="print:hidden">
              <FormattedDateInput 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)} 
                className="w-64"
              />
            </div>
          ) : null}
          <div className={`${!readOnly ? 'hidden print:block' : ''} border-b border-black px-2 w-60 min-h-[1rem] text-[11px] text-center`}>
            {new Date(reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>

        {/* --- Main Content Table (Info, A, B, C, Footer) --- */}
      <div className="mb-2 print:pr-1">
        <table className="w-full border-collapse border-2 border-black text-[11px]">
          <tbody>
              {/* Header Info Row */}
              <tr>
                <td className="p-1 border-2 border-black w-1/3">
                  <div className="flex gap-2"><span className="font-bold">College:</span><span className="underline font-bold">{college}</span></div>
                  <div className="flex gap-2"><span className="font-bold">Department:</span><span className="underline font-bold">{department}</span></div>
                </td>
                <td colSpan={3} className="p-1 border-2 border-black">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1"><span className="font-bold">Name of Faculty:</span><div className="underline font-bold uppercase h-4 flex items-center">{initialData?.faculty_name || user?.name}</div></div>
                    <div className="text-left"><span className="font-bold">Position:</span><div className="underline font-bold uppercase h-4 flex items-center">{initialData?.position || position}</div></div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-bold">Designation (if any):</span>
                    <div className="flex-1 space-y-1">
                      {designations.map((desc, idx) => (
                        <div key={idx} className="flex gap-2 items-center group">
                          <input 
                            type="text" 
                            value={desc} 
                            onChange={(e) => {
                              const newDescs = [...designations];
                              newDescs[idx] = e.target.value;
                              setDesignations(newDescs);
                            }} 
                            className="flex-1 border-b border-black outline-none px-2 bg-transparent print:hidden" 
                            placeholder="Enter designation..."
                          />
                          <div className="hidden print:block border-b border-black min-h-[1rem] px-2 flex-1">
                            {desc}
                          </div>
                          {designations.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => setDesignations(designations.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 print:hidden text-xs"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        type="button"
                        onClick={() => setDesignations([...designations, ''])}
                        className="text-green-600 text-[10px] font-bold flex items-center gap-1 print:hidden"
                      >
                        <Plus className="w-2.5 h-2.5" /> Add Designation
                      </button>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Section A Header */}
              <tr className="font-bold bg-gray-50/50 print:bg-transparent">
                <td className="border-2 border-black p-1 w-1/3">A. Instruction</td>
                <td className="border-2 border-black p-1 text-center w-32">Date</td>
                <td className="border-2 border-black p-1 text-center">Accomplishment</td>
                <td className="border-2 border-black p-1 text-center">Issues/Concerns</td>
              </tr>
              {sectionA.map((entry) => (
                <ReportEntryRow 
                  key={entry.id} 
                  entry={entry} 
                  showMainTitle={false}
                  onUpdate={(id, field, value) => updateEntryField('A', id, field, value)}
                  onRemove={(id) => removeEntryRow('A', id)}
                  onAddBullet={(id, type) => addBulletPoint('A', id, type)}
                  onRemoveBullet={(id, type, bulletId) => removeBulletPoint('A', id, type, bulletId)}
                  onUpdateBullet={(id, type, bulletId, content) => updateBulletPoint('A', id, type, bulletId, content)}
                  onAddInstructionItem={(id) => addInstructionItem('A', id)}
                  onRemoveInstructionItem={(id, itemId) => removeInstructionItem('A', id, itemId)}
                  onUpdateInstructionTitle={(id, itemId, title) => updateInstructionTitle('A', id, itemId, title)}
                  onAddInstructionBullet={(id, itemId) => addInstructionBullet('A', id, itemId)}
                  onRemoveInstructionBullet={(id, itemId, bulletId) => removeInstructionBullet('A', id, itemId, bulletId)}
                  onUpdateInstructionBullet={(id, itemId, bulletId, content) => updateInstructionBullet('A', id, itemId, bulletId, content)}
                  readOnly={readOnly}
                />
              ))}
              {!readOnly && (
              <tr className="print:hidden">
                <td className="border-r-2 border-black border-b-2 p-1">
                  <button type="button" onClick={() => addEntryRow('A')} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs"><Plus className="w-3 h-3" /> Add Instruction Entry</button>
                </td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-b-2 border-black"></td>
              </tr>
              )}
              {othersA.map((entry) => (
                <ReportEntryRow 
                  key={entry.id}
                  entry={{ ...entry, title: entry.title || 'Others' }} 
                  onUpdate={(id, field, value) => updateOthersField('A', id, field, value)}
                  onRemove={(id) => removeOthersEntry('A', id)}
                  onAddBullet={(id, type) => addOthersBullet('A', id, type)}
                  onRemoveBullet={(id, type, bulletId) => removeOthersBullet('A', id, type, bulletId)}
                  onUpdateBullet={(id, type, bulletId, content) => updateOthersBullet('A', id, type, bulletId, content)}
                  onAddInstructionItem={(id) => addOthersInstructionItem('A', id)}
                  onRemoveInstructionItem={(id, itemId) => removeOthersInstructionItem('A', id, itemId)}
                  onUpdateInstructionTitle={(id, itemId, title) => updateOthersInstructionTitle('A', id, itemId, title)}
                  onAddInstructionBullet={(id, itemId) => addOthersInstructionBullet('A', id, itemId)}
                  onRemoveInstructionBullet={(id, itemId, bulletId) => removeOthersInstructionBullet('A', id, itemId, bulletId)}
                  onUpdateInstructionBullet={(id, itemId, bulletId, content) => updateOthersInstructionBullet('A', id, itemId, bulletId, content)}
                  readOnly={readOnly}
                />
              ))}
              {!readOnly && (
              <tr className="print:hidden">
                <td className="border-r-2 border-black border-b-2 p-1">
                  <button type="button" onClick={() => addOthersEntry('A')} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs"><Plus className="w-3 h-3" /> Add Others</button>
                </td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-b-2 border-black"></td>
              </tr>
              )}
              <tr>
                <td colSpan={2} className="p-1 align-top border-b-2 border-black">
                  <span className="font-bold">Remarks</span>
                  {(userRole === 'chair' || userRole === 'dean') ? (
                    <textarea
                      value={remarksA}
                      onChange={(e) => setRemarksA(e.target.value)}
                      onBlur={(e) => saveSectionRemarks('A', e.target.value)}
                      className="w-full min-h-[3rem] text-xs p-1.5 border border-gray-300 rounded mt-1 resize-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none print:border-none print:p-1.5 print:resize-none print:bg-transparent print:text-black print:placeholder-transparent"
                      placeholder="Enter remarks for Section A..."
                    />
                  ) : (
                    <div className="mt-1 min-h-[3rem] italic text-gray-500 bg-gray-50 p-2 border border-dashed border-gray-200 print:border-none print:p-0 print:bg-transparent print:text-black print:not-italic">
                      {remarksA}
                    </div>
                  )}
                </td>
                <td colSpan={2} className="p-1 align-top border-l-2 border-b-2 border-black">
                  <span className="font-bold block">Approved</span>
                  <div className="flex justify-around items-end gap-4 mt-8">
                    <div className="text-center flex-1 px-2 relative flex flex-col justify-end">
                          {deanSignature && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                              <img 
                                src={deanSignature} 
                                alt="Dean Signature" 
                                className="h-14 w-auto object-contain mix-blend-multiply opacity-95"
                                style={{ width: `${deanSignatureSize}%`, maxWidth: '100%' }}
                              />
                            </div>
                          )}
                          <div className="border-b border-black font-bold uppercase text-[10px] relative z-10">{selectedDean}</div>
                          <div className="text-[9px] mt-0.5">Dean</div>
                        </div>
                    <div className="w-24 text-center">
                      <div className="print:hidden">
                        <FormattedDateInput 
                          value={sectionADate} 
                          onChange={(e) => setSectionADate(e.target.value)} 
                          underline
                          className="mx-auto"
                        />
                      </div>
                      <div className="hidden print:block border-b border-black text-[10px] h-4 flex items-center justify-center text-center">
                        {new Date(sectionADate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[9px] mt-0.5">Date</div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Section B Header */}
              <tr className="font-bold bg-gray-50/50 print:bg-transparent">
                <td className="border-2 border-black p-1">B. Designation (if applicable)</td>
                <td className="border-2 border-black p-1 text-center">Date</td>
                <td className="border-2 border-black p-1 text-center">Accomplishment</td>
                <td className="border-2 border-black p-1 text-center">Issues/Concerns</td>
              </tr>
              {sectionB.map((entry) => (
                <ReportEntryRow 
                  key={entry.id} 
                  entry={entry} 
                  onUpdate={(id, field, value) => updateEntryField('B', id, field, value)}
                  onRemove={(id) => removeEntryRow('B', id)}
                  onAddBullet={(id, type) => addBulletPoint('B', id, type)}
                  onRemoveBullet={(id, type, bulletId) => removeBulletPoint('B', id, type, bulletId)}
                  onUpdateBullet={(id, type, bulletId, content) => updateBulletPoint('B', id, type, bulletId, content)}
                  onAddInstructionItem={(id) => addInstructionItem('B', id)}
                  onRemoveInstructionItem={(id, itemId) => removeInstructionItem('B', id, itemId)}
                  onUpdateInstructionTitle={(id, itemId, title) => updateInstructionTitle('B', id, itemId, title)}
                  onAddInstructionBullet={(id, itemId) => addInstructionBullet('B', id, itemId)}
                  onRemoveInstructionBullet={(id, itemId, bulletId) => removeInstructionBullet('B', id, itemId, bulletId)}
                  onUpdateInstructionBullet={(id, itemId, bulletId, content) => updateInstructionBullet('B', id, itemId, bulletId, content)}
                  readOnly={readOnly}
                />
              ))}
              {!readOnly && (
              <tr className="print:hidden">
                <td className="border-r-2 border-black border-b-2 p-1">
                  <button type="button" onClick={() => addEntryRow('B')} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs"><Plus className="w-3 h-3" /> Add Designation Entry</button>
                </td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-b-2 border-black"></td>
              </tr>
              )}
              {othersB.map((entry) => (
                <ReportEntryRow 
                  key={entry.id}
                  entry={{ ...entry, title: entry.title || 'Others' }} 
                  onUpdate={(id, field, value) => updateOthersField('B', id, field, value)}
                  onRemove={(id) => removeOthersEntry('B', id)}
                  onAddBullet={(id, type) => addOthersBullet('B', id, type)}
                  onRemoveBullet={(id, type, bulletId) => removeOthersBullet('B', id, type, bulletId)}
                  onUpdateBullet={(id, type, bulletId, content) => updateOthersBullet('B', id, type, bulletId, content)}
                  onAddInstructionItem={(id) => addOthersInstructionItem('B', id)}
                  onRemoveInstructionItem={(id, itemId) => removeOthersInstructionItem('B', id, itemId)}
                  onUpdateInstructionTitle={(id, itemId, title) => updateOthersInstructionTitle('B', id, itemId, title)}
                  onAddInstructionBullet={(id, itemId) => addOthersInstructionBullet('B', id, itemId)}
                  onRemoveInstructionBullet={(id, itemId, bulletId) => removeOthersInstructionBullet('B', id, itemId, bulletId)}
                  onUpdateInstructionBullet={(id, itemId, bulletId, content) => updateOthersInstructionBullet('B', id, itemId, bulletId, content)}
                  readOnly={readOnly}
                />
              ))}
              {!readOnly && (
              <tr className="print:hidden">
                <td className="border-r-2 border-black border-b-2 p-1">
                  <button type="button" onClick={() => addOthersEntry('B')} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs"><Plus className="w-3 h-3" /> Add Others</button>
                </td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-r-2 border-black border-b-2"></td>
                <td className="border-b-2 border-black"></td>
              </tr>
              )}
              <tr>
                <td colSpan={2} className="p-1 align-top border-b-2 border-black">
                  <span className="font-bold">Remarks</span>
                  {(userRole === 'chair' || userRole === 'dean') ? (
                    <textarea
                      value={remarksB}
                      onChange={(e) => setRemarksB(e.target.value)}
                      onBlur={(e) => saveSectionRemarks('B', e.target.value)}
                      className="w-full min-h-[3rem] text-xs p-1.5 border border-gray-300 rounded mt-1 resize-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none print:border-none print:p-1.5 print:resize-none print:bg-transparent print:text-black print:placeholder-transparent"
                      placeholder="Enter remarks for Section B..."
                    />
                  ) : (
                    <div className="mt-1 min-h-[3rem] italic text-gray-500 bg-gray-50 p-2 border border-dashed border-gray-200 print:border-none print:p-0 print:bg-transparent print:text-black print:not-italic">
                      {remarksB}
                    </div>
                  )}
                </td>
                <td colSpan={2} className="p-1 align-top border-l-2 border-b-2 border-black">
                  <span className="font-bold block">Approved</span>
                  <div className="flex justify-around items-end gap-4 mt-8">
                    <div className="text-center flex-1 px-2 relative flex flex-col justify-end">
                          {deanSignature && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                              <img 
                                src={deanSignature} 
                                alt="Dean Signature" 
                                className="h-14 w-auto object-contain mix-blend-multiply opacity-95"
                                style={{ width: `${deanSignatureSize}%`, maxWidth: '100%' }}
                              />
                            </div>
                          )}
                          <div className="border-b border-black font-bold uppercase text-[10px] relative z-10">{selectedDean}</div>
                          <div className="text-[9px] mt-0.5">Dean</div>
                        </div>
                    <div className="w-24 text-center">
                      <div className="print:hidden">
                        <FormattedDateInput 
                          value={sectionBDate} 
                          onChange={(e) => setSectionBDate(e.target.value)} 
                          underline
                          className="mx-auto"
                        />
                      </div>
                      <div className="hidden print:block border-b border-black text-[10px] h-4 flex items-center justify-center text-center">
                        {new Date(sectionBDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[9px] mt-0.5">Date</div>
                    </div>
                  </div>
                </td>
              </tr>

              {/* Section C Header */}
              <tr className="font-bold bg-gray-50/50 print:bg-transparent">
                <td className="border-2 border-black p-1 w-1/3">C. Research, Extension and Production (if applicable)</td>
                <td className="border-2 border-black p-1 text-center">Date</td>
                <td className="border-2 border-black p-1 text-center">Accomplishment</td>
                <td className="border-2 border-black p-1 text-center">Issues/Concerns</td>
              </tr>
              {sectionC.map((entry) => (
                <ReportEntryRow 
                  key={entry.id} 
                  entry={entry} 
                  onUpdate={(id: string, field: keyof ReportEntry, value: string) => updateEntryField('C', id, field, value)}
                  onRemove={(id: string) => removeEntryRow('C', id)}
                  onAddBullet={(id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets') => addBulletPoint('C', id, type)}
                  onRemoveBullet={(id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string) => removeBulletPoint('C', id, type, bulletId)}
                  onUpdateBullet={(id: string, type: 'accomplishments' | 'issues' | 'instruction_bullets', bulletId: string, content: string) => updateBulletPoint('C', id, type, bulletId, content)}
                  onAddInstructionItem={(id: string) => addInstructionItem('C', id)}
                  onRemoveInstructionItem={(id: string, itemId: string) => removeInstructionItem('C', id, itemId)}
                  onUpdateInstructionTitle={(id: string, itemId: string, title: string) => updateInstructionTitle('C', id, itemId, title)}
                  onAddInstructionBullet={(id: string, itemId: string) => addInstructionBullet('C', id, itemId)}
                  onRemoveInstructionBullet={(id: string, itemId: string, bulletId: string) => removeInstructionBullet('C', id, itemId, bulletId)}
                  onUpdateInstructionBullet={(id: string, itemId: string, bulletId: string, content: string) => updateInstructionBullet('C', id, itemId, bulletId, content)}
                  readOnly={readOnly}
                />
              ))}
              {!readOnly && (
                <tr className="print:hidden">
                  <td className="border-r-2 border-black border-b-2 p-1">
                    <button type="button" onClick={() => addEntryRow('C')} className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs"><Plus className="w-3 h-3" /> Add Research/Extension Entry</button>
                  </td>
                  <td className="border-r-2 border-black border-b-2"></td>
                  <td className="border-r-2 border-black border-b-2"></td>
                  <td className="border-b-2 border-black"></td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="p-1 align-top border-b-2 border-black">
                  <span className="font-bold">Remarks</span>
                  {(userRole === 'chair' || userRole === 'dean') ? (
                    <textarea
                      value={remarksC}
                      onChange={(e) => setRemarksC(e.target.value)}
                      onBlur={(e) => saveSectionRemarks('C', e.target.value)}
                      className="w-full min-h-[3rem] text-xs p-1.5 border border-gray-300 rounded mt-1 resize-none focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none print:border-none print:p-1.5 print:resize-none print:bg-transparent print:text-black print:placeholder-transparent"
                      placeholder="Enter remarks for Section C..."
                    />
                  ) : (
                    <div className="mt-1 min-h-[3rem] italic text-gray-500 bg-gray-50 p-2 border border-dashed border-gray-200 print:border-none print:p-0 print:bg-transparent print:text-black print:not-italic">
                      {remarksC}
                    </div>
                  )}
                </td>
                <td colSpan={2} className="p-1 align-top border-l-2 border-b-2 border-black">
                  <span className="font-bold block">Approved</span>
                  <div className="flex justify-around items-end gap-4 mt-8">
                    <div className="text-center flex-1 px-2 relative flex flex-col justify-end">
                      {directorSignature && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                          <img 
                            src={directorSignature} 
                            alt="Director Signature" 
                            className="h-14 w-auto object-contain mix-blend-multiply opacity-95"
                            style={{ width: `${directorSignatureSize}%`, maxWidth: '100%' }}
                          />
                        </div>
                      )}
                      <div className="border-b border-black font-bold uppercase text-[10px] h-4 flex items-center justify-center relative z-10">{selectedDirector}</div>
                      <div className="text-[9px] mt-0.5">Director/VPRET</div>
                    </div>
                    <div className="w-24 text-center">
                      <div className="print:hidden">
                        <FormattedDateInput 
                          value={sectionCDate} 
                          onChange={(e) => setSectionCDate(e.target.value)} 
                          underline
                          className="mx-auto"
                        />
                      </div>
                      <div className="hidden print:block border-b border-black text-[10px] h-4 flex items-center justify-center text-center">
                        {new Date(sectionCDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[9px] mt-0.5">Date</div>
                    </div>
                  </div>
                </td>
              </tr>
              {/* --- Footer Section (Integrated as Grid) --- */}
              <tr>
                <td colSpan={4} className="p-0 border-2 border-black border-t-0">
                  <div className="grid grid-cols-3 divide-x-2 divide-black">
                    {/* Column 1: Prepared By / Attachments */}
                    <div className="flex flex-col">
                      {/* Prepared By */}
                      <div className="p-1 min-h-[5.5rem] border-b-2 border-black relative">
                        <span className="font-bold uppercase text-left relative z-10">Prepared by:</span>
                        <div className="flex justify-between items-end gap-10 px-4 pb-1 mt-6 relative z-10">
                          <div className="flex-1 min-w-[120px] text-center relative flex flex-col justify-end">
                            {/* E-Signature Display */}
                             {facultySignature && (
                               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                                 <img 
                                   src={facultySignature} 
                                   alt="Faculty Signature" 
                                   className="h-14 w-auto object-contain mix-blend-multiply opacity-95"
                                   style={{ width: `${facultySignatureSize}%`, maxWidth: '100%' }}
                                 />
                               </div>
                             )}
                            <div className="border-b border-black uppercase font-bold text-[10px] h-4 flex items-center justify-center whitespace-nowrap relative z-10">{initialData?.faculty_name || user?.name}</div>
                            <div className="text-[9px] mt-0.5 text-center">Faculty</div>
                          </div>
                          <div className="w-24 text-center">
                            {!readOnly ? (
                              <div className="print:hidden">
                                <FormattedDateInput 
                                  value={preparedDate} 
                                  onChange={(e) => setPreparedDate(e.target.value)} 
                                  underline
                                  className="mx-auto"
                                />
                              </div>
                            ) : null}
                            <div className={`${!readOnly ? 'hidden print:block' : ''} border-b border-black text-[10px] h-4 flex items-center justify-center text-center`}>
                              {new Date(preparedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                            <div className="text-[9px] mt-0.5">Date</div>
                          </div>
                        </div>
                      </div>
                      {/* Attachments (screen only; hidden in print) */}
                      <div className="p-1 min-h-[5rem] print:hidden">
                        <span className="font-bold uppercase text-left">Attachments:</span>
                        <div className="mt-2">
                          {!readOnly && (
                            <>
                              <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                multiple
                                accept="image/*"
                                className="hidden"
                              />
                              <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="print:hidden flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 text-[10px] font-bold transition-colors mb-2"
                              >
                                {isUploading ? 'Uploading...' : 'Upload Images'}
                              </button>
                            </>
                          )}
                          
                          {/* Image Previews */}
                          <div className="grid grid-cols-3 gap-1 mt-1">
                            {attachments.map((url, idx) => (
                              <div 
                                key={idx} 
                                className="relative group/img aspect-square border border-gray-200 rounded overflow-hidden cursor-zoom-in"
                                role="button"
                                tabIndex={0}
                                onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { setViewerIndex(idx); setViewerOpen(true); } }}
                              >
                                <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                                {!readOnly && (
                                  <button 
                                    type="button"
                                    onClick={() => removeAttachment(idx)}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity print:hidden"
                                  >
                                    <X className="w-2 h-2" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          {attachments.length === 0 && !isUploading && (
                            <div className="text-[9px] italic text-gray-400 print:hidden">No images uploaded.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Reviewed By / Remarks */}
                    <div className="flex flex-col">
                      {/* Reviewed By */}
                      <div className="p-1 min-h-[5.5rem] border-b-2 border-black relative">
                        <span className="font-bold uppercase text-left relative z-10">Reviewed by:</span>

                        <div className="flex justify-between items-end gap-10 px-4 pb-1 mt-6 relative z-10">
                          <div className="flex-1 min-w-[120px] text-center relative flex flex-col justify-end">
                            {/* E-Signature Display */}
                            {chairSignature && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                                <img 
                                  src={chairSignature} 
                                  alt="Chair Signature" 
                                  className="h-14 w-auto object-contain mix-blend-multiply opacity-95"
                                  style={{ width: `${chairSignatureSize}%`, maxWidth: '100%' }}
                                />
                              </div>
                            )}
                            <div className="border-b border-black uppercase font-bold text-[10px] h-4 flex items-center justify-center text-center whitespace-nowrap relative z-10">{selectedChair}</div>
                            <div className="text-[9px] mt-0.5">Department Chair</div>
                          </div>
                          <div className="w-24 text-center">
                            {userRole === 'chair' ? (
                              <div className="print:hidden">
                                <FormattedDateInput 
                                  value={footerReviewedDate} 
                                  onChange={(e) => setFooterReviewedDate(e.target.value)} 
                                  underline
                                  className="mx-auto"
                                />
                              </div>
                            ) : null}
                            <div className={`${userRole === 'chair' ? 'hidden print:block' : ''} border-b border-black text-[10px] h-4 flex items-center justify-center text-center`}>
                              {footerReviewedDate ? new Date(footerReviewedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                            </div>
                            <div className="text-[9px] mt-0.5">Date</div>
                          </div>
                        </div>
                      </div>
                      {/* Remarks */}
                      <div className="p-1 min-h-[5rem]">
                        <span className="font-bold uppercase text-left">Remarks:</span>
                        {userRole === 'chair' ? (
                           <textarea 
                             value={footerRemarks1}
                             onChange={(e) => setFooterRemarks1(e.target.value)}
                             className="w-full min-h-[3rem] text-[10px] p-1 border border-gray-300 rounded mt-1 print:border-none print:p-1 print:resize-none print:bg-transparent print:text-black print:placeholder-transparent"
                             placeholder="Enter remarks..."
                           />
                        ) : (
                          <div className="mt-1 min-h-[3rem] italic text-gray-500 bg-gray-50 p-2 border border-dashed border-gray-200 print:border-none print:p-0 print:bg-transparent print:text-black print:not-italic">
                            {footerRemarks1}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Approved / Remarks */}
                    <div className="flex flex-col">
                      {/* Approved */}
                      <div className="p-1 min-h-[5.5rem] border-b-2 border-black relative">
                        <span className="font-bold uppercase text-left relative z-10">Approved</span>

                        <div className="flex justify-between items-end gap-10 px-4 pb-1 mt-6 relative z-10">
                          <div className="flex-1 min-w-[120px] text-center relative flex flex-col justify-end">
                            {/* E-Signature Display */}
                            {deanSignature && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-0 pointer-events-none">
                                <img 
                                  src={deanSignature} 
                                  alt="Dean Signature" 
                                  className="h-14 w-auto object-contain mix-blend-multiply opacity-95"
                                  style={{ width: `${deanSignatureSize}%`, maxWidth: '100%' }}
                                />
                              </div>
                            )}
                            <div className="border-b border-black uppercase font-bold text-[10px] h-4 flex items-center justify-center text-center whitespace-nowrap relative z-10">{selectedDean}</div>
                            <div className="text-[9px] mt-0.5">Dean</div>
                          </div>
                          <div className="w-24 text-center">
                            {userRole === 'dean' ? (
                              <div className="print:hidden">
                                <FormattedDateInput 
                                  value={footerApprovedDate} 
                                  onChange={(e) => setFooterApprovedDate(e.target.value)} 
                                  underline
                                  className="mx-auto"
                                />
                              </div>
                            ) : null}
                            <div className={`${userRole === 'dean' ? 'hidden print:block' : ''} border-b border-black text-[10px] h-4 flex items-center justify-center text-center`}>
                              {footerApprovedDate ? new Date(footerApprovedDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                            </div>
                            <div className="text-[9px] mt-0.5">Date</div>
                          </div>
                        </div>
                      </div>
                      {/* Remarks */}
                      <div className="p-1 min-h-[5rem]">
                        <span className="font-bold uppercase text-left">Remarks:</span>
                        {userRole === 'dean' ? (
                           <textarea 
                             value={footerRemarks2}
                             onChange={(e) => setFooterRemarks2(e.target.value)}
                             className="w-full min-h-[3rem] text-[10px] p-1 border border-gray-300 rounded mt-1 print:border-none print:p-1 print:resize-none print:bg-transparent print:text-black print:placeholder-transparent"
                             placeholder="Enter remarks..."
                           />
                        ) : (
                          <div className="mt-1 min-h-[3rem] italic text-gray-500 bg-gray-50 p-2 border border-dashed border-gray-200 print:border-none print:p-0 print:bg-transparent print:text-black print:not-italic">
                            {footerRemarks2}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Print-only second page for attachments */}
      {attachments && attachments.length > 0 && (
        <div className="hidden print:block" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
          <div className="mt-0">
            <div className="text-center mb-1">
              <span className="font-bold uppercase text-[12px]">Attachments</span>
            </div>
            <div className="grid grid-cols-2 gap-1 px-0">
              {attachments.map((url, idx) => (
                <div 
                  key={idx} 
                  className="p-0 m-0 flex items-center justify-center"
                  style={{ minHeight: '80mm', breakInside: 'avoid', pageBreakInside: 'avoid' as any }}
                >
                  <img 
                    src={url} 
                    alt={`Attachment ${idx + 1}`} 
                    className="max-w-full object-contain"
                    style={{ maxHeight: '78mm' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screen-only Attachment Viewer */}
      {viewerOpen && (
        <div className="print:hidden">
          <ReportImageViewer images={attachments} initialIndex={viewerIndex} onClose={() => setViewerOpen(false)} />
        </div>
      )}

      {showSubmitSuccess && (
        <Portal>
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 m-4">
              <div className="text-center space-y-2">
                <LottiePlayer path="/check.json" loop={false} className="mx-auto w-28 h-28" name="submit-success" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {initialData?.id ? 'Report updated successfully' : 'Report submitted successfully'}
                </h3>
                <p className="text-sm text-slate-600">Your submission has been saved.</p>
              </div>
              <div className="mt-6 flex justify-center">
                <button 
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium shadow-sm shadow-emerald-600/20"
                  onClick={() => {
                    setShowSubmitSuccess(false);
                    if (onExit) {
                      onExit();
                    } else {
                      router.push('/faculty/wfh');
                    }
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
