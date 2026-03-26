'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  onSubmit: () => Promise<void> | void;
  onSuccess?: () => void;
  disabled?: boolean;
  submitting?: boolean;
};

declare global {
  interface Window {
    lottie?: any;
  }
}

export default function PaperPlaneButton({ onSubmit, onSuccess, disabled, submitting }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.lottie) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
    s.async = true;
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
  }, []);

  useEffect(() => {
    let t: any;
    const init = () => {
      if (!window.lottie || !containerRef.current || animRef.current) return;
      animRef.current = window.lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path: '/paperplane.json',
        name: 'paperplane',
      });
      setReady(true);
    };
    if (window.lottie) init();
    else t = setInterval(() => { if (window.lottie) { clearInterval(t); init(); } }, 100);
    return () => { if (t) clearInterval(t); if (animRef.current) { animRef.current.destroy(); animRef.current = null; } };
  }, []);

  const handleClick = useCallback(async () => {
    if (disabled || submitting) return;
    if (animRef.current) {
      animRef.current.goToAndStop(0, true);
      animRef.current.play();
    }
    try {
      await onSubmit();
    } finally {
      // wait for animation to complete before calling onSuccess
      if (animRef.current && typeof animRef.current.addEventListener === 'function') {
        await new Promise<void>((resolve) => {
          const done = () => {
            animRef.current.removeEventListener('complete', done);
            resolve();
          };
          animRef.current.addEventListener('complete', done);
        });
      }
      if (onSuccess) onSuccess();
    }
  }, [disabled, submitting, onSubmit, onSuccess]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !ready || submitting}
      className="flex items-center gap-4 px-7 py-3 bg-white text-slate-900 rounded-2xl hover:shadow-lg transition-all shadow-md disabled:opacity-50 font-semibold text-sm border border-slate-200"
    >
      <div ref={containerRef} className="w-16 h-16" />
      <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
    </button>
  );
}
