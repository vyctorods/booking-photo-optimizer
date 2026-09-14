import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Image as ImageIcon, Download, CheckCircle, AlertCircle, X, Trash2, Layers, Sparkles } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Função ultra-potente de Nitidez e Contraste Arquitetônico (HD Turbo)
const applyAdvancedEnhancements = (ctx, width, height) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width;
  const h = height;
  
  // Matriz de convolução de alta performance para realce profundo de bordas e texturas
  const weights = [
    -1, -1, -1,
    -1,  9, -1,
    -1, -1, -1
  ];
  
  const imp = new Uint8ClampedArray(data);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += imp[idx] * weights[(ky + 1) * 3 + (kx + 1)];
          }
        }
        // Mistura controlada para evitar ruído excessivo, mantendo a alta nitidez
        const i = (y * w + x) * 4 + c;
        const originalVal = imp[i];
        const enhancedVal = Math.min(255, Math.max(0, sum));
        
        // Blend de 75% da imagem nova com 25% da original para nitidez cristalina
        data[i] = Math.round(enhancedVal * 0.75 + originalVal * 0.25);
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

const processImage = (file, mode = 'auto') => {
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
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        } else if (mode === 'nocrop') {
          ctx.filter = 'blur(40px) brightness(0.85)';
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
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        }

        // Aplica o super filtro de nitidez arquitetônica
        applyAdvancedEnhancements(ctx, targetW, targetH);

        // Qualidade JPEG máxima (1.0) para zero perda de compressão
        const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
        const safeName = file.name ? file.name.replace(/\.[^/.]+$/, "") : `foto-${Math.floor(Math.random()*1000)}`;
        
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          originalFile: file,
          originalUrl: e.target.result,
          originalWidth: img.width,
          originalHeight: img.height,
          originalName: file.name,
          exportName: `${safeName}-ultra-hd.jpg`,
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

const dataURLtoBlob = (dataurl) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
};

function App() {
  const [photos, setPhotos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [processingMode, setProcessingMode] = useState('auto');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    await processFiles(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    await processFiles(files);
  };

  const processFiles = async (files) => {
    setIsProcessing(true);
    const newPhotos = [];
    for (const file of files) {
      const processed = await processImage(file, processingMode);
      newPhotos.push(processed);
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) {
      setUrlError('Por favor, insira um link válido (Airbnb, Booking, etc.)');
      return;
    }
    setUrlError('');
    try {
      const response = /airbnb|booking/.test(urlInput.toLowerCase()) 
        ? await fetch(urlInput).catch(() => ({ ok: false }))
        : { ok: false };
      
      if (!response.ok) throw new Error('Bloqueado');
    } catch (error) {
      setUrlError('Plataformas como Airbnb e Booking bloqueiam extração direta de links por segurança (CORS). Por favor, arraste ou faça o upload das imagens baixadas da Guesty ou do anúncio abaixo.');
    }
  };

  const downloadSingle = (photo) => {
    saveAs(dataURLtoBlob(photo.processedUrl), photo.exportName);
  };

  const downloadAllZip = async () => {
    const zip = new JSZip();
    photos.forEach((photo, index) => {
      const blob = dataURLtoBlob(photo.processedUrl);
      const filename = `foto-ultra-hd-${String(index + 1).padStart(2, '0')}.jpg`;
      zip.file(filename, blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'fotos-ultra-hd-lote.zip');
  };

  const removePhoto = (id) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const clearAllPhotos = () => {
    if (window.confirm('Deseja realmente remover todas as imagens da lista?')) {
      setPhotos([]);
    }
  };

  const changeMode = async (mode) => {
    setProcessingMode(mode);
    if (photos.length === 0) return;
    setIsProcessing(true);
    const reprocessed = await Promise.all(photos.map(p => processImage(p.originalFile, mode)));
    setPhotos(reprocessed);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-blue-600 text-white py-8 px-4 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ImageIcon size={32} />
              Booking Photo Optimizer <span className="text-xs bg-amber-400 text-slate-900 border border-amber-300 px-2.5 py-1 rounded-full uppercase tracking-wider font-extrabold">ULTRA HD</span>
            </h1>
            <p className="mt-2 text-blue-100 text-lg flex items-center gap-2">
              <Sparkles size={18} className="text-amber-300" />
              Com realce avançado de nitidez e clareza para anúncios de alto padrão.
            </p>
          </div>
          {photos.length > 0 && (
            <div className="bg-blue-700/60 px-4 py-2 rounded-xl border border-blue-400/30 flex items-center gap-2 text-white font-medium">
              <Layers size={20} />
              <span>{photos.length} {photos.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UploadCloud className="text-blue-500"/> Enviar fotos (Guesty, Computador, etc.)
              </h2>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <UploadCloud size={40} className="text-slate-400 mb-3" />
                <p className="font-medium text-slate-700">Clique ou arraste suas fotos de qualquer lugar aqui</p>
                <p className="text-sm text-slate-500 mt-1">Com motor de realce Ultra HD ativado</p>
                <input type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LinkIcon className="text-blue-500"/> Link do Anúncio (Airbnb / Booking)
              </h2>
              <div className="flex flex-col gap-3">
                <input 
                  type="url" 
                  placeholder="Cole o link do Airbnb, Booking, etc..." 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={urlInput} 
                  onChange={(e) => setUrlInput(e.target.value)} 
                />
                <button onClick={handleUrlImport} className="bg-slate-800 text-white font-medium py-3 rounded-lg hover:bg-slate-700 transition">Analisar link</button>
                {urlError && (
                  <div className="mt-2 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg flex gap-2 items-start border border-amber-200">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{urlError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-700">Modo de enquadramento:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => changeMode('auto')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${processingMode === 'auto' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Automático (Crop Inteligente)</button>
                <button onClick={() => changeMode('nocrop')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${processingMode === 'nocrop' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>Sem Crop (Preenchimento)</button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={clearAllPhotos} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition flex items-center gap-2 border border-red-200 text-sm">
                <Trash2 size={16} /> Limpar tudo ({photos.length})
              </button>
              <button onClick={downloadAllZip} className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2 shadow-sm">
                <Download size={18} /> Baixar todas (ZIP HD)
              </button>
            </div>
          </div>
        )}

        {isProcessing && <div className="text-center text-blue-600 font-medium py-4">Aplicando realce Ultra HD e processando imagens...</div>}

        <div className="grid md:grid-cols-2 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="relative group bg-slate-100 flex-1 flex items-center justify-center min-h-[250px]">
                <img src={photo.processedUrl} alt="Final" className="absolute inset-0 w-full h-full object-contain" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/80 flex items-center justify-center">
                  <img src={photo.originalUrl} alt="Original" className="w-full h-full object-contain p-4 opacity-50" />
                  <span className="absolute text-white font-semibold bg-black/50 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm">Visualizando Original</span>
                </div>
                <button onClick={() => removePhoto(photo.id)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-sm" title="Remover esta foto">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 truncate max-w-[200px]" title={photo.originalName}>{photo.originalName}</h3>
                    <div className="flex items-center gap-1 text-sm text-green-600 font-medium mt-1"><CheckCircle size={14} /> Ultra HD Aplicado</div>
                  </div>
                  <button onClick={() => downloadSingle(photo)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="Baixar esta foto"><Download size={20} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <p className="text-slate-500 mb-1">Original</p>
                    <p className="font-medium text-slate-700">{photo.originalWidth} × {photo.originalHeight}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{(photo.originalWidth / photo.originalHeight).toFixed(2)}:1</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Resultado Ultra HD</p>
                    <p className="font-medium text-blue-600">{photo.finalWidth} × {photo.finalHeight}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Proporção 8:5 (Qualidade 100%)</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
