export const processImage = (file, mode = 'auto') => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const targetW = 1280;
        const targetH = 900;
        const targetRatio = targetW / targetH;
        const origRatio = img.width / img.height;

        canvas.width = targetW;
        canvas.height = targetH;

        if (mode === 'auto') {
          let drawW = targetW;
          let drawH = targetH;
          let offsetX = 0;
          let offsetY = 0;

          if (origRatio > targetRatio) {
            drawW = img.width * (targetH / img.height);
            offsetX = (targetW - drawW) / 2;
          } else {
            drawH = img.height * (targetW / img.width);
            offsetY = (targetH - drawH) / 2;
          }
          
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        } else if (mode === 'nocrop') {
          ctx.filter = 'blur(40px) brightness(0.8)';
          ctx.drawImage(img, -100, -100, targetW + 200, targetH + 200);
          ctx.filter = 'none';

          let drawW = targetW;
          let drawH = targetH;
          let offsetX = 0;
          let offsetY = 0;

          if (origRatio > targetRatio) {
             drawH = targetW / origRatio;
             offsetY = (targetH - drawH) / 2;
          } else {
             drawW = targetH * origRatio;
             offsetX = (targetW - drawW) / 2;
          }
          
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const safeName = file.name ? file.name.replace(/\.[^/.]+$/, "") : `booking-foto-${Math.floor(Math.random()*1000)}`;
        
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          originalFile: file,
          originalUrl: e.target.result,
          originalWidth: img.width,
          originalHeight: img.height,
          originalName: file.name,
          exportName: `${safeName}-otimizada.jpg`,
          processedUrl: dataUrl,
          finalWidth: targetW,
          finalHeight: targetH,
          status: 'ready',
          mode: mode
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export const dataURLtoBlob = (dataurl) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
};
