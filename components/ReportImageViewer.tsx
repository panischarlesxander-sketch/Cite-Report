'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ReportImageViewerProps {
  images: string[];
  onClose: () => void;
  initialIndex?: number;
}

export default function ReportImageViewer({ images, onClose, initialIndex = 0 }: ReportImageViewerProps) {
  const imageCount = images?.length ?? 0;

  const safeInitial = useMemo(() => {
    const idx = Number.isFinite(initialIndex) ? initialIndex : 0;
    if (imageCount <= 0) return 0;
    return Math.min(Math.max(idx, 0), imageCount - 1);
  }, [initialIndex, imageCount]);

  const [activeIndex, setActiveIndex] = useState(safeInitial);

  useEffect(() => {
    setActiveIndex(safeInitial);
  }, [safeInitial]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setActiveIndex((i) => (i - 1 + imageCount) % imageCount);
      if (e.key === 'ArrowRight') setActiveIndex((i) => (i + 1) % imageCount);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [imageCount, onClose]);

  if (imageCount === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Attachment Images</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-hidden">
          <div className="relative bg-black rounded-xl overflow-hidden">
            <img
              src={images[activeIndex]}
              alt={`Attachment ${activeIndex + 1}`}
              className="w-full max-h-[62vh] object-contain bg-black"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur transition-colors"
                  title="Previous"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur transition-colors"
                  title="Next"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            <div className="absolute left-3 bottom-3 text-xs font-semibold text-white/90 bg-black/40 px-2.5 py-1 rounded-full">
              {activeIndex + 1} / {images.length}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-4 overflow-x-auto">
              <div className="flex gap-2">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`relative h-16 w-20 rounded-lg overflow-hidden border transition-colors flex-shrink-0 ${
                      idx === activeIndex ? 'border-indigo-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    title={`Attachment ${idx + 1}`}
                  >
                    <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
