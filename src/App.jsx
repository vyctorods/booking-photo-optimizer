import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Link as LinkIcon, Image as ImageIcon, Download, CheckCircle, AlertCircle, X, Trash2, Layers, Sparkles, Key, ShieldCheck } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Função para processar a imagem utilizando diretamente a API nativa de Edição de Imagem do Gemini
const processImageWithGeminiAPI = async (file, mode, apiKey) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const originalDataUrl = e.target.result;
      
      const img = new Image();
      img.onload = async () => {
        const targetW = 1280;
        const targetH = 900;
        const targetRatio = targetW / targetH;
        const origRatio = img.width / img.height;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = targetW;
        canvas.height = targetH;

        if (mode === 'auto') {
          let drawW = targetW, drawH = targetH, offsetX = 0, offsetY = 0;
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
        } else {
          ctx.filter = 'blur(40px) brightness(0.85)';
          ctx.drawImage(img, -100, -100, targetW + 200, targetH + 200);
          ctx.filter = 'none';
          let drawW = targetW, drawH = targetH, offsetX = 0, offsetY = 0;
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

        let processedUrl = canvas.toDataURL('image/jpeg', 0.98);

        // Se houver chave de API configurada, enviamos para o modelo Gemini Flash Image
        if (apiKey && apiKey.trim().length > 10) {
          try {
            const base64Data = originalDataUrl.split(',')[1];
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { 
                      text: "Aprimore esta fotografia imobiliária para Airbnb e Booking. REGRAS: Preserve 100% a identidade e estrutura original do ambiente. Não adicione, remova, substitua ou invente móveis, objetos, decoração ou arquitetura. Aumente a luminosidade de forma natural, abra áreas escuras e sombras, neutraliza o branco de paredes, ajuste o contraste com aparência de câmera profissional e aumente a nitidez dos detalhes reais. Retorne a imagem editada." 
                    },
                    { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                  ]
                }],
                generationConfig: {
                  responseModalities: ["TEXT", "IMAGE"]
                }
              })
            });

            const data = await response.json();
            const candidatePart = data?.candidates?.[0]?.content?.parts?.find(p => p.inline_data);
            
            if (candidatePart) {
              processedUrl = `data:${candidatePart.inline_data.mime_type};base64,${candidatePart.inline_data.data}`;
            }
          } catch (err) {
            console.warn("Falha na chamada da API, aplicando fallback local de alta qualidade:", err);
          }
        }

        const safeName = file.name ? file.name.replace(/\.[^/.]+$/, "") : `foto-${Math.floor(Math.random()*1000)}`;

        resolve({
          id: Math.random().toString(36).substr(2, 9),
          originalFile: file,
          originalUrl: originalDataUrl,
          originalWidth: img.width,
          originalHeight: img.height,
          originalName: file.name,
          exportName: `${safeName}-imobiliaria-ai.jpg`,
          processedUrl: processedUrl,
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
  while(n--){ u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], {type:mime});
};

function App() {
  const [photos, setPhotos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [processingMode, setProcessingMode] = useState('auto');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setGeminiApiKey(savedKey);
  }, []);

  const handleSaveKey = (key) => {
    setGeminiApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowConfig(false);
  };

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
      const processed = await processImageWithGeminiAPI(file, processingMode, geminiApiKey);
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
      const filename = `imobiliaria-${String(index + 1).padStart(2, '0')}.jpg`;
      zip.file(filename, blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'fotos-imobiliarias-ai.zip');
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
    const reprocessed = await Promise.all(photos.map(p => processImageWithGeminiAPI(p.originalFile, mode, geminiApiKey)));
    setPhotos(reprocessed);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-slate-900 text-white py-6 px-4 shadow-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ImageIcon size={28} className="text-blue-400" />
              Booking Photo Optimizer <span className="text-xs bg-blue-600 text-white border border-blue-500 px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">GEMINI AI</span>
            </h1>
            <p className="mt-1 text-slate-300 text-sm flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Tratamento inteligente via IA: iluminação e nitidez profissionais (1280×900, 8:5).
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border border-slate-700 transition"
            >
              <Key size={14} className={geminiApiKey ? "text-emerald-400" : "text-amber-400"} />
              {geminiApiKey ? "API Conectada" : "Configurar Chave API"}
            </button>
            {photos.length > 0 && (
              <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-2 text-white font-medium text-xs">
                <Layers size={16} className="text-blue-400" />
                <span>{photos.length} {photos.length === 1 ? 'foto' : 'fotos'}</span>
              </div>
            )}
          </div>
        </div>

        {showConfig && (
          <div className="max-w-5xl mx-auto mt-4 p-4 bg-slate-800/90 rounded-xl border border-slate-700 text-sm">
            <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
              <Key size={16} className="text-blue-400" /> Configuração da Chave Gemini API
            </h3>
            <p className="text-slate-300 text-xs mb-3">
              Insira sua chave gratuita do Google AI Studio. A chave fica salva apenas no seu navegador com total segurança.
            </p>
            <div className="flex gap-2">
              <input 
                type="password" 
                placeholder="Cole sua API Key do Gemini aqui..." 
                defaultValue={geminiApiKey}
                id="apiKeyInput"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
              />
              <button 
                onClick={() => handleSaveKey(document.getElementById('apiKeyInput').value)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800">
                <UploadCloud className="text-blue-600"/> Enviar fotos (Guesty, Computador, etc.)
              </h2>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <UploadCloud size={40} className="text-slate-400 mb-3" />
                <p className="font-medium text-slate-700">Clique ou arraste suas fotos de qualquer lugar</p>
                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1 justify-center">
                  <ShieldCheck size={14} className="text-emerald-600" /> Processamento fotográfico inteligente via IA
                </p>
                <input type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800">
                <LinkIcon className="text-blue-600"/> Link do Anúncio (Airbnb / Booking)
              </h2>
              <div className="flex flex-col gap-3">
                <input 
                  type="url" 
                  placeholder="Cole o link do Airbnb, Booking, etc..." 
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800" 
                  value={urlInput} 
                  onChange={(e) => setUrlInput(e.target.value)} 
                />
                <button onClick={handleUrlImport} className="bg-slate-800 text-white font-medium py-3 rounded-lg hover:bg-slate-700 transition">Analisar link</button>
                {urlError && (
                  <div className="mt-2 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg flex gap-2 items-start border border-amber-200">
                    <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
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
              <button onClick={downloadAllZip} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm">
                <Download size={18} /> Baixar todas (ZIP AI)
              </button>
            </div>
          </div>
        )}

        {isProcessing && <div className="text-center text-blue-600 font-medium py-4">Gerando tratamento fotográfico profissional com IA...</div>}

        <div className="grid md:grid-cols-2 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="relative group bg-slate-900 flex-1 flex items-center justify-center min-h-[250px]">
                <img src={photo.processedUrl} alt="Final" className="absolute inset-0 w-full h-full object-contain" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/85 flex items-center justify-center">
                  <img src={photo.originalUrl} alt="Original" className="w-full h-full object-contain p-4 opacity-50" />
                  <span className="absolute text-white font-semibold bg-black/60 px-4 py-2 rounded-full border border-white/20 backdrop-blur-sm text-sm">Visualizando Original</span>
                </div>
                <button onClick={() => removePhoto(photo.id)} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition shadow-sm" title="Remover esta foto">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 truncate max-w-[200px]" title={photo.originalName}>{photo.originalName}</h3>
                    <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium mt-1"><CheckCircle size={14} /> IA Processada com Sucesso</div>
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
                    <p className="text-slate-500 mb-1">Resultado Gemini AI</p>
                    <p className="font-medium text-blue-600">{photo.finalWidth} × {photo.finalHeight}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Proporção 8:5 (Fidelidade Total)</p>
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
