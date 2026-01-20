
import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, X, Calculator, Search, FileText, 
  Sparkles, Stethoscope, Activity, Calendar as CalendarIcon,
  Camera, Image as ImageIcon, Trash2, UserPlus, CheckCircle, Target, MousePointerClick,
  Maximize2, Share2, Download, Move, ZoomIn, ZoomOut, RotateCcw, Hand, MousePointer2, Smartphone, Monitor, LayoutTemplate,
  Minimize2, Grid, ChevronLeft, Plus, Edit2, Minus
} from 'lucide-react';
import { db } from '../db';
import { Patient, Appointment, Tooth, BotoxRecord, PaymentMethod, BotoxPoint, PatientFile } from '../types';

const MUSCLES_LIST = [
  "Frontal", "Prócero", "Corrugador (esq.)", "Corrugador (dir.)", 
  "Orbicular do olho (esq.)", "Orbicular do olho (dir.)", "Nasal", 
  "Depressor do septo nasal", "Orbicular do boca", "Depressor do ângulo da boca", 
  "Mentoniano", "Platisma", "Masseter", "Temporal"
];

// Helper para carregar imagem
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const Atendimento: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [isWalkIn, setIsWalkIn] = useState(false);

  const [mode, setMode] = useState<'odontologia' | 'harmonizacao'>('odontologia');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [procedure, setProcedure] = useState('');
  const [notes, setNotes] = useState('');
  const [totalCost, setTotalCost] = useState<number>(0); 
  const [amountPaid, setAmountPaid] = useState<number>(0); 
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [odontograma, setOdontograma] = useState<Tooth[]>([]);
  
  const [botox, setBotox] = useState<BotoxRecord>({
    muscles: MUSCLES_LIST.map(m => ({ name: m, units: 0 })),
    productName: '',
    batchNumber: '',
    dilution: '',
    expiryDate: '',
    totalUnits: 0,
    faceMap: { imageUrl: '', points: [] },
    comparison: { beforePhoto: '', afterPhoto: '', notes: '' }
  });

  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const mapImageRef = useRef<HTMLImageElement>(null);

  // --- ZOOM & PAN STATES ---
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanningMode, setIsPanningMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // --- EDITOR DE COLAGEM ---
  const [isCollageOpen, setIsCollageOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [collageConfig, setCollageConfig] = useState({
    orientation: 'portrait' as 'portrait' | 'landscape',
    before: { x: 0, y: 0, scale: 1 },
    after: { x: 0, y: 0, scale: 1 }
  });
  const [isDragging, setIsDragging] = useState<'before' | 'after' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    initView();
    const handleHash = () => { if (window.location.hash === '#atendimento') initView(); };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    if (isCollageOpen && botox.comparison?.beforePhoto && botox.comparison?.afterPhoto) {
      renderCollage();
    }
  }, [isCollageOpen, collageConfig, botox.comparison]);

  // Reset zoom when modal opens
  useEffect(() => {
    if (isMapModalOpen) {
        setMapTransform({ scale: 1, x: 0, y: 0 });
        setIsPanningMode(false);
    }
  }, [isMapModalOpen]);

  const initView = async () => {
    const all = await db.getAll<Patient>('patients');
    setPatients(all);
    
    const editId = localStorage.getItem('editAppointmentId');
    const pId = localStorage.getItem('atendimentoPatientId');
    const reset = localStorage.getItem('resetAtendimento');

    if (reset) {
      resetForm();
      localStorage.removeItem('resetAtendimento');
    } else if (editId) {
      const app = await db.getById<Appointment>('appointments', editId);
      if (app) {
        setEditingAppointmentId(app.id);
        setSelectedPatientId(app.patientId);
        setSearchTerm(app.patientName);
        setProcedure(app.procedure);
        setNotes(app.notes || '');
        setDate(app.date);
        setTime(app.time);
        setMode(app.type || 'odontologia');
        setPhotos(app.photos || []);
        if (app.odontograma) setOdontograma(app.odontograma);
        if (app.botox) {
           setBotox({
             ...app.botox,
             faceMap: app.botox.faceMap || { imageUrl: '', points: [] },
             comparison: app.botox.comparison || { beforePhoto: '', afterPhoto: '', notes: '' }
           });
        }
        if (app.amount) setTotalCost(app.amount);
      }
      localStorage.removeItem('editAppointmentId');
    } else if (pId) {
      resetForm();
      const p = all.find(x => x.id === pId);
      if (p) { setSelectedPatientId(p.id); setSearchTerm(p.name); }
      localStorage.removeItem('atendimentoPatientId');
    } else {
      initStates();
    }
  };

  const initStates = () => {
    const ids = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
    setOdontograma(ids.map(id => ({ id, status: 'healthy' })));
    setBotox({
      muscles: MUSCLES_LIST.map(m => ({ name: m, units: 0 })),
      productName: '',
      batchNumber: '',
      dilution: '',
      expiryDate: '',
      totalUnits: 0,
      faceMap: { imageUrl: '', points: [] },
      comparison: { beforePhoto: '', afterPhoto: '', notes: '' }
    });
    setPhotos([]);
  };

  const resetForm = () => {
    setEditingAppointmentId(null); 
    setSelectedPatientId(''); 
    setSearchTerm(''); 
    setProcedure('');
    setNotes(''); 
    setTotalCost(0); 
    setAmountPaid(0); 
    setIsWalkIn(false);
    initStates();
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  };

  const updateBotoxMuscle = (index: number, val: number) => {
    const newMuscles = [...botox.muscles];
    newMuscles[index].units = val;
    const total = newMuscles.reduce((sum, m) => sum + m.units, 0);
    setBotox({ ...botox, muscles: newMuscles, totalUnits: total });
  };

  // --- MAPEAMENTO FACIAL ---
  const handleMapImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBotox(prev => ({
        ...prev,
        faceMap: { ...prev.faceMap!, imageUrl: reader.result as string }
      }));
      setIsMapModalOpen(true);
    };
    reader.readAsDataURL(file as Blob);
  };

  const calculateCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const imgElement = mapImageRef.current;
    if (!imgElement) return null;
    const rect = imgElement.getBoundingClientRect();
    
    let clientX, clientY;

    if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    } else {
        return null;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  // --- HANDLERS DE INTERAÇÃO NO MAPA (Mouse/Touch) ---
  
  const handleContainerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (isPanningMode) {
       setIsPanning(true);
       setPanStart({ x: clientX - mapTransform.x, y: clientY - mapTransform.y });
    } else {
       handleMapClick(e as any);
    }
  };

  const handleContainerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    if (isPanningMode && isPanning) {
       e.preventDefault();
       setMapTransform(prev => ({
         ...prev,
         x: clientX - panStart.x,
         y: clientY - panStart.y
       }));
    } else if (draggingPointId) {
       e.preventDefault();
       const coords = calculateCoords(e);
       if (!coords) return;
       const constrainedX = Math.max(0, Math.min(100, coords.x));
       const constrainedY = Math.max(0, Math.min(100, coords.y));

       setBotox(prev => ({
         ...prev,
         faceMap: {
           ...prev.faceMap!,
           points: prev.faceMap!.points.map(p => 
             p.id === draggingPointId ? { ...p, x: constrainedX, y: constrainedY } : p
           )
         }
       }));
    }
  };

  const handleContainerUp = () => {
    setIsPanning(false);
    setDraggingPointId(null);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!botox.faceMap?.imageUrl || isPanningMode) return;
    if (editingPointId) { setEditingPointId(null); return; }
    
    const coords = calculateCoords(e);
    if (!coords) return;
    if (coords.x < 0 || coords.x > 100 || coords.y < 0 || coords.y > 100) return;

    const newPoint: BotoxPoint = { id: Date.now().toString(), x: coords.x, y: coords.y, units: 0 };
    setBotox(prev => ({
      ...prev,
      faceMap: { ...prev.faceMap!, points: [...prev.faceMap!.points, newPoint] }
    }));
    setEditingPointId(newPoint.id);
  };

  const handlePointDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if (isPanningMode) return;
    e.stopPropagation(); 
    setDraggingPointId(id);
    setEditingPointId(id);
  };

  const updatePointUnits = (id: string, units: number) => {
    setBotox(prev => ({
      ...prev,
      faceMap: { ...prev.faceMap!, points: prev.faceMap!.points.map(p => p.id === id ? { ...p, units } : p) }
    }));
  };

  const removePoint = (id: string) => {
    setBotox(prev => ({
      ...prev,
      faceMap: { ...prev.faceMap!, points: prev.faceMap!.points.filter(p => p.id !== id) }
    }));
    if (editingPointId === id) setEditingPointId(null);
  };

  const handleZoom = (delta: number) => {
    setMapTransform(prev => {
      const newScale = Math.max(1, Math.min(5, prev.scale + delta)); 
      return { ...prev, scale: newScale };
    });
  };

  const handleComparisonUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBotox(prev => ({
        ...prev,
        comparison: {
          ...prev.comparison,
          [type === 'before' ? 'beforePhoto' : 'afterPhoto']: reader.result as string
        }
      }));
    };
    reader.readAsDataURL(file as Blob);
  };

  const removeComparisonPhoto = (type: 'before' | 'after') => {
    setBotox(prev => ({
      ...prev,
      comparison: {
        ...prev.comparison,
        [type === 'before' ? 'beforePhoto' : 'afterPhoto']: ''
      }
    }));
  };

  // --- EDITOR DE COLAGEM (Logic) ---
  const drawCollageToContext = (
      ctx: CanvasRenderingContext2D, 
      width: number, 
      height: number, 
      img1: HTMLImageElement, 
      img2: HTMLImageElement, 
      isExport: boolean
  ) => {
        const isPortrait = collageConfig.orientation === 'portrait';
        
        // Fundo
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        const headerHeight = isPortrait ? 150 : 120;
        const footerHeight = isPortrait ? 120 : 100;
        let areaW, areaH, areaX1, areaY1, areaX2, areaY2;

        if (isPortrait) {
            const contentHeight = height - headerHeight - footerHeight;
            areaW = width;
            areaH = contentHeight / 2;
            areaX1 = 0; areaY1 = headerHeight;
            areaX2 = 0; areaY2 = headerHeight + areaH;
        } else {
            const contentHeight = height - headerHeight - footerHeight;
            areaW = width / 2;
            areaH = contentHeight;
            areaX1 = 0; areaY1 = headerHeight;
            areaX2 = width / 2; areaY2 = headerHeight;
        }

        // Helper interno de desenho
        const drawImg = (img: HTMLImageElement, areaX: number, areaY: number, areaW: number, areaH: number, config: {x: number, y: number, scale: number}, isGhost: boolean) => {
            const imgRatio = img.width / img.height;
            const areaRatio = areaW / areaH;
            let drawW, drawH;

            // Calculate cover dimensions
            if (imgRatio > areaRatio) {
                drawH = areaH;
                drawW = areaH * imgRatio;
            } else {
                drawW = areaW;
                drawH = areaW / imgRatio;
            }

            // Apply scaling
            drawW *= config.scale;
            drawH *= config.scale;

            // Calculate position (centered + offset)
            const centerX = areaX + areaW / 2;
            const centerY = areaY + areaH / 2;
            const posX = centerX - (drawW / 2) + config.x;
            const posY = centerY - (drawH / 2) + config.y;

            ctx.save();
            if (isGhost) {
                // Clip to content area (avoid drawing over header/footer) to allow seeing what's outside the slot but inside the page
                ctx.beginPath();
                ctx.rect(0, headerHeight, width, height - headerHeight - footerHeight);
                ctx.clip();
                ctx.globalAlpha = 0.2; // Opacidade baixa para o fantasma
            } else {
                // Clip to specific slot (Normal behavior)
                ctx.beginPath();
                ctx.rect(areaX, areaY, areaW, areaH);
                ctx.clip();
                ctx.globalAlpha = 1.0;
            }
            
            ctx.drawImage(img, posX, posY, drawW, drawH);
            ctx.restore();
        };

        // Draw Ghosts (Somente se não estiver exportando)
        if (!isExport) {
             drawImg(img1, areaX1, areaY1, areaW, areaH, collageConfig.before, true);
             drawImg(img2, areaX2, areaY2, areaW, areaH, collageConfig.after, true);
        }

        // Draw Mains
        drawImg(img1, areaX1, areaY1, areaW, areaH, collageConfig.before, false);
        drawImg(img2, areaX2, areaY2, areaW, areaH, collageConfig.after, false);

        // --- Overlays (Sempre no topo) ---
        
        // Separator
        ctx.fillStyle = '#FFFFFF';
        if (isPortrait) ctx.fillRect(0, areaY2 - 2, width, 4);
        else ctx.fillRect(areaX2 - 2, areaY1, 4, areaH);

        // Header Background Redraw (para cobrir vazamentos do fantasma)
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, width, headerHeight);

        // Footer Background Redraw
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, height - footerHeight, width, footerHeight);

        // Labels
        const labelHeight = isPortrait ? 60 : 50;
        const fontSize = isPortrait ? 30 : 24;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const l1Y = isPortrait ? (areaY2 - labelHeight) : (areaY1 + areaH - labelHeight);
        ctx.fillRect(areaX1, l1Y, areaW, labelHeight);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ANTES', areaX1 + areaW/2, l1Y + labelHeight/2);

        ctx.fillStyle = 'rgba(37, 99, 235, 0.8)';
        const l2Y = isPortrait ? (height - footerHeight - labelHeight) : (areaY2 + areaH - labelHeight);
        ctx.fillRect(areaX2, l2Y, areaW, labelHeight);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('DEPOIS', areaX2 + areaW/2, l2Y + labelHeight/2);

        // Header Text
        ctx.font = `900 ${isPortrait ? 50 : 40}px Inter, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('NAZZARI ODONTOLOGIA', width / 2, headerHeight * 0.45);
        ctx.font = `500 ${isPortrait ? 28 : 22}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(`${searchTerm || 'Paciente'} • ${procedure || 'Harmonização'}`, width / 2, headerHeight * 0.75);

        // Footer Text
        ctx.font = `bold ${isPortrait ? 32 : 26}px Inter, sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Dr. Willian Nazzari', width / 2, height - footerHeight + (footerHeight * 0.55));
        
        // Watermark
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.font = `900 ${isPortrait ? 120 : 100}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.textAlign = 'center';
        ctx.fillText('NAZZARI', 0, 0);
        ctx.restore();
  };

  const renderCollage = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !botox.comparison?.beforePhoto || !botox.comparison?.afterPhoto) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurações de dimensão
    const isPortrait = collageConfig.orientation === 'portrait';
    const width = isPortrait ? 1080 : 1920;
    const height = isPortrait ? 1350 : 1080;
    canvas.width = width;
    canvas.height = height;

    try {
        const img1 = await loadImage(botox.comparison.beforePhoto);
        const img2 = await loadImage(botox.comparison.afterPhoto);
        drawCollageToContext(ctx, width, height, img1, img2, false);
    } catch (e) {
        console.error("Erro ao renderizar colagem", e);
    }
  };

  const downloadCollage = async () => {
      if (!botox.comparison?.beforePhoto || !botox.comparison?.afterPhoto) return;
      
      const isPortrait = collageConfig.orientation === 'portrait';
      const width = isPortrait ? 1080 : 1920;
      const height = isPortrait ? 1350 : 1080;
      
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;
      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) return;

      try {
          const img1 = await loadImage(botox.comparison.beforePhoto);
          const img2 = await loadImage(botox.comparison.afterPhoto);
          
          // Desenha sem os fantasmas (isExport = true)
          drawCollageToContext(ctx, width, height, img1, img2, true);
          
          const link = document.createElement('a');
          link.download = `Resultado_${searchTerm.replace(/\s/g, '_')}.jpg`;
          link.href = offscreenCanvas.toDataURL('image/jpeg', 0.95);
          link.click();
      } catch (e) {
          alert("Erro ao gerar imagem para download.");
      }
  };

  const handleCanvasStart = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Suporte a Mouse e Touch
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const isPortrait = collageConfig.orientation === 'portrait';
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    const normX = clickX / rect.width;
    const normY = clickY / rect.height;

    let target: 'before' | 'after' = 'before';
    if (isPortrait) { if (normY > 0.55) target = 'after'; } 
    else { if (normX > 0.5) target = 'after'; }

    setIsDragging(target);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleCanvasMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    // Suporte a Mouse e Touch
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    const sensitivity = 1; 

    setCollageConfig(prev => ({
        ...prev,
        [isDragging]: {
            ...prev[isDragging],
            x: prev[isDragging].x + (deltaX * sensitivity),
            y: prev[isDragging].y + (deltaY * sensitivity)
        }
    }));
    setDragStart({ x: clientX, y: clientY });
  };

  const handleCanvasEnd = () => {
      setIsDragging(null);
  };

  const adjustCollageZoom = (target: 'before' | 'after', delta: number) => {
    setCollageConfig(prev => ({
        ...prev,
        [target]: {
            ...prev[target],
            scale: Math.max(0.1, Math.min(3, prev[target].scale + delta))
        }
    }));
  };

  const shareWhatsApp = () => {
      downloadCollage();
      const phone = patients.find(p => p.id === selectedPatientId)?.phone.replace(/\D/g, '') || '';
      const text = `Olá! Confira o resultado do seu procedimento.`;
      const waUrl = phone 
        ? `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
  };

  // --- PERSISTÊNCIA ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPhotos(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file as Blob);
    });
  };

  const handleSave = async () => {
    if ((!selectedPatientId && !isWalkIn) || !procedure) return alert("Selecione paciente e procedimento.");
    if (isWalkIn && !searchTerm.trim()) return alert("Digite o nome do paciente.");

    setIsSaving(true);
    try {
      let finalPatientId = selectedPatientId;
      let finalPatientName = searchTerm;

      if (isWalkIn && !selectedPatientId) {
        const newPatientId = Date.now().toString();
        const newPatient: Patient = {
          id: newPatientId,
          name: searchTerm,
          cpf: 'Não Informado',
          phone: '', email: '', birthDate: '', address: '', history: 'Cadastro automático',
          createdAt: Date.now()
        };
        await db.save('patients', newPatient);
        finalPatientId = newPatientId;
      }
      
      const app: Appointment = {
        id: editingAppointmentId || Date.now().toString(),
        patientId: finalPatientId,
        patientName: finalPatientName,
        date, time, procedure, status: 'completed', notes,
        type: mode,
        amount: totalCost, 
        photos: photos,
        odontograma: mode === 'odontologia' ? odontograma : undefined,
        botox: mode === 'harmonizacao' ? botox : undefined
      };
      
      await db.save('appointments', app);
      
      if (!editingAppointmentId && amountPaid > 0) {
        await db.save('transactions', {
          id: Date.now().toString() + 'T', 
          patientId: finalPatientId, 
          patientName: finalPatientName,
          type: 'income', amount: amountPaid, 
          description: `Pagto ref: ${procedure}`,
          date, category: mode === 'odontologia' ? 'Odonto' : 'Harmonização', paymentMethod
        });
      }
      
      alert("Prontuário salvo!");
      resetForm();
      window.location.hash = '#patients';
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Atendimento</h2>
          <div className="flex bg-gray-100 p-1 rounded-2xl mt-3 w-fit">
            <button 
              onClick={() => { setMode('odontologia'); if(!procedure) setProcedure(''); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'odontologia' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Stethoscope size={16}/> Odontologia
            </button>
            <button 
              onClick={() => { setMode('harmonizacao'); if(!procedure) setProcedure('Aplicação de Toxina Botulínica'); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'harmonizacao' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Sparkles size={16}/> Harmonização
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={isSaving} className={`${mode === 'odontologia' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20'} text-white px-10 py-3.5 rounded-2xl font-black shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 transform hover:-translate-y-1`}>
            <Save size={20}/> {isSaving ? 'Gravando...' : 'Salvar Prontuário'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda (Paciente/Financeiro) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
             <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {isWalkIn ? 'Nome do Paciente Avulso' : 'Buscar Paciente'}
                  </label>
                  <button onClick={() => { setIsWalkIn(!isWalkIn); setSearchTerm(''); setSelectedPatientId(''); }} className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-all flex items-center gap-1 ${isWalkIn ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {isWalkIn ? <CheckCircle size={12}/> : <UserPlus size={12}/>} {isWalkIn ? 'Modo Avulso' : 'Avulso?'}
                  </button>
                </div>
                <div className="relative">
                  <input type="text" placeholder={isWalkIn ? "Digite o nome..." : "Buscar..."} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (!isWalkIn) { setShowPatientList(true); setSelectedPatientId(''); }}} onFocus={() => !isWalkIn && setShowPatientList(true)} className={`w-full pl-12 pr-4 py-4 border rounded-2xl font-bold transition-all outline-none ${isWalkIn ? 'bg-blue-50 border-blue-200 focus:border-blue-500' : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-500'}`} />
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${isWalkIn ? 'text-blue-400' : 'text-gray-300'}`} size={18}/>
                </div>
                {!isWalkIn && showPatientList && searchTerm && !selectedPatientId && (
                  <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-52 overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setSearchTerm(p.name); setShowPatientList(false); }} className="w-full text-left p-4 hover:bg-blue-50 font-bold border-b border-gray-50 last:border-0">
                        <p>{p.name}</p>
                      </button>
                    ))}
                  </div>
                )}
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none" /></div>
               <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Hora</label><input type="text" value={time} onChange={e => setTime(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold outline-none" /></div>
             </div>
             <div className="pt-6 border-t border-gray-50 space-y-4">
               <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Valor (R$)</label><input type="number" step="0.01" value={totalCost} onChange={e => setTotalCost(Number(e.target.value))} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xl" /></div>
               <div><label className="block text-[10px] font-black text-green-600 uppercase mb-2">Pago (R$)</label><input type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} className="w-full p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl font-black text-xl" /></div>
             </div>
          </div>
        </div>

        {/* Coluna Direita (Procedimento) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <input placeholder="Título do Procedimento..." value={procedure} onChange={e => setProcedure(e.target.value)} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-black text-gray-900 mb-6 outline-none focus:bg-white focus:border-gray-200 transition-all" />
             <textarea rows={4} placeholder="Anotações técnicas..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-6 bg-gray-50 border border-gray-100 rounded-[1.5rem] font-medium text-gray-700 outline-none resize-none mb-8"></textarea>

             {/* Fotos Gerais */}
             <div className="mb-8 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14} /> Fotos</h5>
                  <label className="cursor-pointer bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2">
                    <Camera size={16}/> Adicionar <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
                {photos.length > 0 ? (
                  <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-white cursor-pointer" onClick={() => setFullScreenImage(photo)}>
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                        <button onClick={(e) => { e.stopPropagation(); setPhotos(photos.filter((_, i) => i !== idx)); }} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100"><Trash2 size={10}/></button>
                      </div>
                    ))}
                  </div>
                ) : <div className="text-center py-4 text-gray-400 text-xs">Sem fotos</div>}
             </div>

             {mode === 'odontologia' ? (
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Odontograma</h4>
                   <div className="flex flex-wrap gap-2 justify-center">
                      {odontograma.map(t => (
                        <button key={t.id} onClick={() => {
                          const statusCycle: any = { healthy: 'cavity', cavity: 'restored', restored: 'missing', missing: 'healthy' };
                          setOdontograma(prev => prev.map(item => item.id === t.id ? { ...item, status: statusCycle[item.status] } : item));
                        }} className={`h-10 w-10 rounded-xl font-black text-[10px] border transition-all ${t.status === 'healthy' ? 'bg-white border-gray-200 text-gray-300' : 'bg-blue-500 text-white border-blue-600'}`}>
                          {t.id}
                        </button>
                      ))}
                   </div>
                </div>
             ) : (
                <div className="space-y-8">
                   <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl">
                      <div className="flex items-center gap-2"><Activity size={18} className="text-purple-600" /><span className="text-xs font-black text-purple-700 uppercase">Protocolo HOF</span></div>
                      <div className="text-xs font-black text-purple-700 uppercase">Total: {botox.totalUnits} U</div>
                   </div>

                   {/* BOTÃO PARA MAPA FULL SCREEN */}
                   <div 
                     className="bg-black/5 p-8 rounded-[2rem] border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all group relative overflow-hidden"
                     onClick={() => botox.faceMap?.imageUrl ? setIsMapModalOpen(true) : null}
                   >
                      {botox.faceMap?.imageUrl ? (
                        <>
                           <img src={botox.faceMap.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                           <div className="relative z-10 flex flex-col items-center justify-center h-40">
                              <Target size={48} className="text-purple-600 mb-4 drop-shadow-md"/>
                              <h3 className="text-2xl font-black text-white drop-shadow-lg uppercase tracking-tight">Editar Mapeamento</h3>
                              <span className="bg-white/90 text-purple-900 px-3 py-1 rounded-full text-xs font-bold mt-2 shadow-lg">{botox.faceMap.points.length} pontos marcados</span>
                           </div>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-40 cursor-pointer">
                           <Camera size={48} className="text-gray-300 mb-4 group-hover:text-purple-500 transition-colors"/>
                           <span className="font-bold text-gray-400 group-hover:text-purple-600">Carregar Foto do Rosto</span>
                           <input type="file" accept="image/*" onChange={handleMapImageUpload} className="hidden" />
                        </label>
                      )}
                   </div>

                   {/* ESTÚDIO ANTES E DEPOIS */}
                   <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={16}/> Estúdio Antes & Depois</h4>
                        {botox.comparison?.beforePhoto && botox.comparison?.afterPhoto && (
                          <button onClick={() => { setIsCollageOpen(true); }} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-black uppercase hover:bg-purple-700 flex items-center gap-2">
                             <LayoutTemplate size={14}/> Abrir Editor
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {['before', 'after'].map((type) => (
                           <div key={type} className="aspect-[4/5] bg-white rounded-2xl border-2 border-dashed border-gray-200 relative overflow-hidden group">
                              {(botox.comparison as any)[`${type}Photo`] ? (
                                <>
                                  <img src={(botox.comparison as any)[`${type}Photo`]} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                     <button onClick={() => setFullScreenImage((botox.comparison as any)[`${type}Photo`])} className="p-2 bg-white rounded-full"><Maximize2 size={16}/></button>
                                     <button onClick={() => removeComparisonPhoto(type as any)} className="p-2 bg-red-500 text-white rounded-full"><Trash2 size={16}/></button>
                                  </div>
                                </>
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-gray-300 hover:text-purple-500 hover:bg-purple-50 transition-all">
                                   <Plus size={32} />
                                   <span className="text-[10px] font-black uppercase mt-2">{type === 'before' ? 'Antes' : 'Depois'}</span>
                                   <input type="file" className="hidden" accept="image/*" onChange={(e) => handleComparisonUpload(e, type as any)} />
                                </label>
                              )}
                           </div>
                        ))}
                      </div>
                   </div>

                   {/* Tabelas e Dados Extras */}
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-gray-100">
                         <h5 className="text-[10px] font-black text-gray-400 uppercase mb-4">Músculos</h5>
                         <div className="max-h-48 overflow-y-auto space-y-2">
                            {botox.muscles.map((m, idx) => (
                               <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-600">{m.name}</span>
                                  <input type="number" value={m.units || ''} onChange={(e) => updateBotoxMuscle(idx, Number(e.target.value))} className="w-12 p-1 bg-gray-50 rounded text-center font-bold" placeholder="0" />
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-4">
                         <input value={botox.productName} onChange={e => setBotox({...botox, productName: e.target.value})} className="w-full p-3 bg-white border border-gray-100 rounded-xl text-xs font-bold" placeholder="Produto..." />
                         <input value={botox.batchNumber} onChange={e => setBotox({...botox, batchNumber: e.target.value})} className="w-full p-3 bg-white border border-gray-100 rounded-xl text-xs font-bold" placeholder="Lote..." />
                         <input type="date" value={botox.returnDate || ''} onChange={e => setBotox({...botox, returnDate: e.target.value})} className="w-full p-3 bg-purple-50 text-purple-700 border border-purple-100 rounded-xl text-xs font-bold" />
                      </div>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>

      {/* --- MODAL DE MAPEAMENTO (TELA CHEIA IMERSIVA) --- */}
      {isMapModalOpen && botox.faceMap?.imageUrl && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-300">
           
           {/* Área da Imagem (Central - Ocupa tudo menos a barra) */}
           <div className="flex-1 relative overflow-hidden bg-gray-900 cursor-crosshair">
              {/* Transform Container */}
              <div 
                 style={{ 
                   transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})`,
                   transformOrigin: 'center',
                   cursor: isPanningMode ? 'grab' : 'crosshair',
                   touchAction: 'none'
                 }}
                 className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-linear map-container"
                 onMouseDown={handleContainerDown}
                 onMouseMove={handleContainerMove}
                 onMouseUp={handleContainerUp}
                 onMouseLeave={handleContainerUp}
                 onTouchStart={handleContainerDown}
                 onTouchMove={handleContainerMove}
                 onTouchEnd={handleContainerUp}
              >
                 <div className="relative inline-block max-h-screen max-w-full p-4 pb-24 select-none pointer-events-none">
                    <img 
                      ref={mapImageRef}
                      src={botox.faceMap.imageUrl} 
                      className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl pointer-events-none" 
                      alt="Mapeamento" 
                    />
                    {/* Pontos Renderizados */}
                    {botox.faceMap.points.map((p, idx) => (
                        <div 
                          key={p.id}
                          className={`absolute w-5 h-5 flex items-center justify-center z-30 cursor-pointer hover:scale-110 transition-transform ${editingPointId === p.id ? 'scale-125 z-40' : ''}`}
                          style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'auto' }}
                          onMouseDown={(e) => handlePointDragStart(e, p.id)}
                          onTouchStart={(e) => handlePointDragStart(e, p.id)}
                        >
                          <div className={`w-full h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white flex items-center justify-center text-[7px] font-black select-none ${p.units > 0 ? 'bg-purple-600 text-white' : 'bg-red-500 text-white'}`}>
                              {p.units}
                          </div>
                          {editingPointId === p.id && (
                              <div className="absolute top-full mt-2 bg-white text-gray-900 px-2 py-1 rounded text-[10px] font-black whitespace-nowrap shadow-lg animate-in zoom-in pointer-events-none">
                                {p.units > 0 ? `${p.units} U` : 'Sem dose'}
                              </div>
                          )}
                        </div>
                    ))}
                 </div>
              </div>

              {/* Floating Zoom Controls */}
              <div className="absolute top-6 right-6 flex flex-col gap-2 z-50">
                 <button 
                   onClick={() => setIsPanningMode(!isPanningMode)}
                   className={`p-3 rounded-xl shadow-lg transition-all ${isPanningMode ? 'bg-purple-600 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'}`}
                   title={isPanningMode ? "Modo Mover (Ativo)" : "Modo Edição"}
                 >
                   {isPanningMode ? <Hand size={24}/> : <MousePointer2 size={24}/>}
                 </button>
                 <div className="h-4"></div>
                 <button onClick={() => handleZoom(0.5)} className="p-3 bg-white/90 hover:bg-white text-gray-700 rounded-xl shadow-lg"><ZoomIn size={24}/></button>
                 <button onClick={() => handleZoom(-0.5)} className="p-3 bg-white/90 hover:bg-white text-gray-700 rounded-xl shadow-lg"><ZoomOut size={24}/></button>
                 <button onClick={() => setMapTransform({scale: 1, x: 0, y: 0})} className="p-3 bg-white/90 hover:bg-white text-gray-700 rounded-xl shadow-lg"><RotateCcw size={24}/></button>
              </div>
           </div>

           {/* Barra de Controles Inferior (Compacta e Responsiva) */}
           <div className="absolute bottom-6 left-4 right-4 md:left-1/4 md:right-1/4 z-50">
             <div className="bg-white/90 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-3 flex items-center gap-4">
                
                {/* Totalizador (Esquerda) */}
                <div className="shrink-0 bg-purple-600 text-white px-3 py-2 rounded-xl shadow-lg">
                   <p className="text-[9px] uppercase opacity-80 font-bold">Total</p>
                   <p className="text-xl font-black leading-none">{botox.faceMap.points.reduce((acc, p) => acc + (p.units || 0), 0)}</p>
                </div>

                {/* Lista Horizontal de Pontos (Meio - Scrollável) */}
                <div className="flex-1 overflow-x-auto flex items-center gap-2 pb-1 scrollbar-hide">
                   {botox.faceMap.points.length === 0 && (
                      <span className="text-xs text-gray-400 font-bold whitespace-nowrap italic px-2">
                        {isPanningMode ? "Modo Mover Ativo" : "Toque na imagem para adicionar"}
                      </span>
                   )}
                   {botox.faceMap.points.map((p, idx) => (
                      <div 
                        key={p.id} 
                        className={`shrink-0 flex items-center gap-2 p-2 rounded-xl border transition-all ${editingPointId === p.id ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/20' : 'bg-gray-50 border-transparent'}`}
                        onClick={() => setEditingPointId(p.id)}
                      >
                         <span className="text-[10px] font-black text-gray-400">#{idx+1}</span>
                         <input 
                           type="number"
                           className="w-10 bg-white border border-gray-200 rounded text-center font-bold text-sm outline-none focus:border-purple-500 p-1"
                           value={p.units || ''}
                           onChange={(e) => updatePointUnits(p.id, Number(e.target.value))}
                           placeholder="0"
                         />
                         <button onClick={(e) => { e.stopPropagation(); removePoint(p.id); }} className="text-gray-300 hover:text-red-500"><X size={14}/></button>
                      </div>
                   ))}
                </div>

                {/* Ações (Direita) */}
                <button 
                  onClick={() => setIsMapModalOpen(false)} 
                  className="shrink-0 bg-gray-900 text-white p-3 rounded-xl hover:bg-black transition-colors shadow-lg"
                  title="Salvar e Fechar"
                >
                   <CheckCircle size={20}/>
                </button>
             </div>
           </div>
        </div>
      )}

      {/* --- EDITOR DE COLAGEM (NOVO LAYOUT TELA CHEIA) --- */}
      {isCollageOpen && (
        <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col animate-in fade-in">
           {/* Canvas Area (Ocupa tudo) */}
           <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <canvas 
                 ref={canvasRef}
                 className="shadow-2xl max-w-full max-h-[85vh] bg-white cursor-move touch-none"
                 style={{ touchAction: 'none' }}
                 onMouseDown={handleCanvasStart}
                 onMouseMove={handleCanvasMove}
                 onMouseUp={handleCanvasEnd}
                 onMouseLeave={handleCanvasEnd}
                 onTouchStart={handleCanvasStart}
                 onTouchMove={handleCanvasMove}
                 onTouchEnd={handleCanvasEnd}
              />
              
              {/* Botões Flutuantes Topo Direita */}
              <div className="absolute top-6 right-6 flex gap-4 z-50">
                 <button onClick={shareWhatsApp} className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-transform hover:scale-110"><Share2 size={24}/></button>
                 <button onClick={() => setIsCollageOpen(false)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"><X size={24}/></button>
              </div>
           </div>

           {/* Barra de Controles Inferior Flutuante */}
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white/90 backdrop-blur-md border border-white/20 shadow-2xl rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-6 z-50">
              
              {/* Orientation */}
              <div className="flex bg-gray-100 rounded-xl p-1 shrink-0 w-full md:w-auto justify-center">
                 <button onClick={() => setCollageConfig(p => ({...p, orientation: 'portrait'}))} className={`p-2 rounded-lg transition-all flex-1 md:flex-none ${collageConfig.orientation === 'portrait' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Smartphone size={20} className="mx-auto"/></button>
                 <button onClick={() => setCollageConfig(p => ({...p, orientation: 'landscape'}))} className={`p-2 rounded-lg transition-all flex-1 md:flex-none ${collageConfig.orientation === 'landscape' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}><Monitor size={20} className="mx-auto"/></button>
              </div>

              {/* Sliders */}
              <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>Antes</span> <span>{collageConfig.before.scale.toFixed(1)}x</span></div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => adjustCollageZoom('before', -0.1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Minus size={12}/></button>
                       <input type="range" min="0.1" max="3" step="0.1" value={collageConfig.before.scale} onChange={e => setCollageConfig(p => ({...p, before: {...p.before, scale: parseFloat(e.target.value)}}))} className="w-full accent-blue-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                       <button onClick={() => adjustCollageZoom('before', 0.1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Plus size={12}/></button>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase"><span>Depois</span> <span>{collageConfig.after.scale.toFixed(1)}x</span></div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => adjustCollageZoom('after', -0.1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Minus size={12}/></button>
                       <input type="range" min="0.1" max="3" step="0.1" value={collageConfig.after.scale} onChange={e => setCollageConfig(p => ({...p, after: {...p.after, scale: parseFloat(e.target.value)}}))} className="w-full accent-blue-600 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"/>
                       <button onClick={() => adjustCollageZoom('after', 0.1)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><Plus size={12}/></button>
                    </div>
                 </div>
              </div>

              {/* Save */}
              <button onClick={downloadCollage} className="p-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-colors shadow-lg w-full md:w-auto flex justify-center items-center"><Download size={20}/></button>
           </div>
        </div>
      )}

      {/* Modal Visualização Simples (TELA CHEIA) */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[110] bg-black flex items-center justify-center animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
           <img src={fullScreenImage} className="max-w-full max-h-full object-contain" />
           <button className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20"><X size={24}/></button>
        </div>
      )}
    </div>
  );
};

export default Atendimento;
