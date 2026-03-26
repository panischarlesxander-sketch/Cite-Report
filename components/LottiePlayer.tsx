'use client';

import { useEffect, useRef, useState } from 'react';
import { createLottieAnimation } from '@/lib/lottieLoader';

interface LottiePlayerProps {
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  name?: string;
  className?: string;
}

export default function LottiePlayer({
  path,
  loop = true,
  autoplay = true,
  name,
  className = '',
}: LottiePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let animation: any = null;
    let mounted = true;

    const initAnimation = async () => {
      if (!containerRef.current || !mounted) return;

      const anim = await createLottieAnimation({
        container: containerRef.current,
        path,
        loop,
        autoplay,
        name,
      });

      if (mounted && anim) {
        animation = anim;
        setIsLoaded(true);
      }
    };

    // Use a small delay to ensure the container is in the DOM (especially if inside a Portal)
    const timeout = setTimeout(() => {
      initAnimation();
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (animation) {
        animation.destroy();
      }
    };
  }, [path, loop, autoplay, name]);

  return <div ref={containerRef} className={className} />;
}
