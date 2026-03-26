// Utility for loading and managing Lottie animations
export const loadLottieScript = (() => {
  let scriptPromise: Promise<void> | null = null;
  
  return (): Promise<void> => {
    if (scriptPromise) return scriptPromise;
    
    if (typeof window !== 'undefined' && (window as any).lottie) {
      return Promise.resolve();
    }
    
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Lottie library'));
      document.head.appendChild(script);
    });
    
    return scriptPromise;
  };
})();

export interface LottieAnimationConfig {
  container: HTMLElement;
  path: string;
  loop?: boolean;
  autoplay?: boolean;
  name?: string;
}

export const createLottieAnimation = async (config: LottieAnimationConfig) => {
  try {
    await loadLottieScript();
    
    // Small delay to ensure container is fully rendered
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const lottie = (window as any).lottie;
    if (!lottie) {
      console.error('Lottie library not available after loading');
      throw new Error('Lottie library not available');
    }
    
    // Verify container is still valid
    if (!config.container || !config.container.isConnected) {
      console.error('Container is not valid or not connected to DOM');
      return null;
    }
    
    // Clear any existing content in container
    config.container.innerHTML = '';
    
    const animation = lottie.loadAnimation({
      container: config.container,
      renderer: 'svg',
      loop: config.loop ?? false,
      autoplay: config.autoplay ?? true,
      path: config.path,
      name: config.name,
    });
    
    if (!animation) {
      console.error('Failed to create animation instance');
      return null;
    }
    
    return animation;
  } catch (error) {
    console.error('Failed to create Lottie animation:', error);
    return null;
  }
};
