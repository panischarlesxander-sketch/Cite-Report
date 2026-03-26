
/**
 * Processes a signature image to remove the background (white/gray) and make it transparent.
 * This runs entirely in the browser using HTML5 Canvas.
 */
export const processSignature = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0);

        // Get pixel data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop through every pixel (RGBA)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate brightness (simple average)
          // You can also use luminance: 0.299*r + 0.587*g + 0.114*b
          const brightness = (r + g + b) / 3;

          // Threshold for "White/Paper"
          // If a pixel is lighter than this, it becomes transparent
          const whiteThreshold = 210; 

          if (brightness > whiteThreshold) {
            // Make transparent
            data[i + 3] = 0; 
          } else {
            // Optional: Make the ink darker/blacker to look professional
            // This is a "Contrast Boost" for the ink
            // data[i] = 0;     // R -> Black
            // data[i + 1] = 0; // G -> Black
            // data[i + 2] = 0; // B -> Black
            // data[i + 3] = 255; // Full Alpha
            
            // Keep original color but ensure full opacity
             data[i + 3] = 255;
          }
        }

        // Put processed data back
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas back to file (PNG to support transparency)
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          // Create a new File object
          const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".png", {
            type: 'image/png',
            lastModified: Date.now(),
          });
          resolve(processedFile);
        }, 'image/png');
      };
      img.onerror = (err) => reject(err);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};
