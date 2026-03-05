import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Download, Trash2, MousePointer2, Share2, Zap, ArrowUp, ArrowDown,
  RotateCw, Undo2, Redo2, Save, Upload, ZoomIn,
  ZoomOut, Maximize, FlipHorizontal2, Box, X,
  FileCode, Settings2, Activity, Square, Eye, EyeOff, Repeat,
  Copy, Clipboard, MoveHorizontal, Circle
} from 'lucide-react';

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&display=swap";
const GRID_SIZE = 10;

const COLORS = [
  { name: 'Noir', value: '#000000' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Vert', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
];

const COMPONENT_TYPES = {
  NMOS: 'NMOS', PMOS: 'PMOS', NPN: 'NPN', PNP: 'PNP',
  RES: 'RES', CAP: 'CAP', IND: 'IND', DIO: 'DIO', Z: 'Z',
  VDD: 'VDD', VSS: 'VSS', GND: 'GND', BUS: 'BUS',
  VDC: 'VDC', VAC: 'VAC',
  OPAMP: 'OPAMP', NOT: 'NOT', AND: 'AND', OR: 'OR', NAND: 'NAND', NOR: 'NOR', XOR: 'XOR',
  PIN: 'PIN', WIRE: 'WIRE', VOLTAGE: 'VOLTAGE', BOX: 'BOX'
};

const ToolIcon = ({ active, onClick, icon, title, shortcut }) => (
  <button 
    onClick={onClick} 
    title={`${title} ${shortcut ? `(${shortcut.toUpperCase()})` : ''}`} 
    className={`relative w-14 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-200 flex-shrink-0 ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
  >
    {icon}
    {shortcut && (
      <span className={`absolute -top-1 -right-1 text-[8px] px-1 rounded-md font-bold ${active ? 'bg-white text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
        {shortcut.toUpperCase()}
      </span>
    )}
  </button>
);

const LIBRARY = [
  { category: 'Transistors', items: [
    { type: COMPONENT_TYPES.NMOS, label: 'NMOS', key: 'n', params: { W: '1u', L: '180n' } },
    { type: COMPONENT_TYPES.PMOS, label: 'PMOS', key: 'p', params: { W: '2u', L: '180n' } },
    { type: COMPONENT_TYPES.NPN, label: 'BJT NPN', params: { model: '2N2222' } },
    { type: COMPONENT_TYPES.PNP, label: 'BJT PNP', params: { model: '2N2907' } },
  ]},
  { category: 'Passifs', items: [
    { type: COMPONENT_TYPES.RES, label: 'Résistance', key: 'r', params: { R: '10k' } },
    { type: COMPONENT_TYPES.CAP, label: 'Condensateur', key: 'c', params: { C: '1p' } },
    { type: COMPONENT_TYPES.IND, label: 'Inductance', key: 'l', params: { L: '1n' } },
    { type: COMPONENT_TYPES.Z, label: 'Impédance Z', key: 'z', params: { Z: '50' } },
    { type: COMPONENT_TYPES.DIO, label: 'Diode', key: 'd' },
  ]},
  { category: 'Power', items: [
    { type: COMPONENT_TYPES.VDD, label: 'Vdd Rail', key: 'v', params: { V: '1.8' } },
    { type: COMPONENT_TYPES.VSS, label: 'Vss Rail', key: 's', params: { V: '-1.8' } },
    { type: COMPONENT_TYPES.GND, label: 'Masse', key: 'g' },
    { type: COMPONENT_TYPES.BUS, label: 'Rail Bus', key: 'b' },
  ]},
  { category: 'Analogique', items: [
    { type: COMPONENT_TYPES.OPAMP, label: 'AOP', key: 'a' },
    { type: COMPONENT_TYPES.VDC, label: 'Source DC', params: { V: '1.0' } },
    { type: COMPONENT_TYPES.VAC, label: 'Source AC', params: { Ampl: '1.0' } },
  ]},
  { category: 'Logique', items: [
    { type: COMPONENT_TYPES.AND, label: 'Porte AND' },
    { type: COMPONENT_TYPES.OR, label: 'Porte OR' },
    { type: COMPONENT_TYPES.NOT, label: 'Inverter' },
    { type: COMPONENT_TYPES.NAND, label: 'NAND' },
    { type: COMPONENT_TYPES.NOR, label: 'NOR' },
    { type: COMPONENT_TYPES.XOR, label: 'XOR' },
  ]},
  { category: 'Outils', items: [
    { type: COMPONENT_TYPES.BOX, label: 'Cadre', key: 'q' },
    { type: COMPONENT_TYPES.VOLTAGE, label: 'Mesure U', key: 'u' },
    { type: COMPONENT_TYPES.PIN, label: 'Pin E/S', key: 'e' },
  ]}
];

const App = () => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [elements, setElements] = useState([]);
  const [wires, setWires] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [clipboard, setClipboard] = useState(null);
  const [canvasTitle, setCanvasTitle] = useState("Circuit_Pro_Design");
  const [selectionRect, setSelectionRect] = useState(null);
  
  const [selectedTool, setSelectedTool] = useState('SELECT');
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedWireIds, setSelectedWireIds] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSpiceModalOpen, setIsSpiceModalOpen] = useState(false);
  
  const [draggingElement, setDraggingElement] = useState(null);
  const [resizingElement, setResizingElement] = useState(null); 
  const [isPanning, setIsPanning] = useState(false);
  const [wireStart, setWireStart] = useState(null);
  const [tempWire, setTempWire] = useState(null);
  const [boxStart, setBoxStart] = useState(null);
  const [tempBox, setTempBox] = useState(null);
  const [busStart, setBusStart] = useState(null);
  const [tempBus, setTempBus] = useState(null);

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-29), JSON.stringify({ elements, wires })]);
    setRedoStack([]);
  }, [elements, wires]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setRedoStack(prev => [...prev, JSON.stringify({ elements, wires })]);
    const parsed = JSON.parse(last);
    setElements(parsed.elements); setWires(parsed.wires);
    setHistory(prev => prev.slice(0, -1));
  }, [elements, wires, history]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(prev => [...prev, JSON.stringify({ elements, wires })]);
    const parsed = JSON.parse(next);
    setElements(parsed.elements); setWires(parsed.wires);
    setRedoStack(prev => prev.slice(0, -1));
  }, [elements, wires, redoStack]);

  const updateParam = useCallback((id, key, value) => {
    saveHistory();
    setElements(prev => prev.map(el => el.id === id ? { ...el, [key]: value } : el));
  }, [saveHistory]);

  const updateSubParam = useCallback((id, key, value) => {
    saveHistory();
    setElements(prev => prev.map(el => el.id === id ? { ...el, params: { ...el.params, [key]: value } } : el));
  }, [saveHistory]);

  const saveProject = useCallback(() => {
    const data = JSON.stringify({ elements, wires, title: canvasTitle });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); 
    link.href = url; link.download = `${canvasTitle}.json`; link.click();
  }, [elements, wires, canvasTitle]);

  const loadProject = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const p = JSON.parse(event.target.result);
        saveHistory();
        setElements(p.elements || []);
        setWires(p.wires || []);
        if (p.title) setCanvasTitle(p.title);
        setIsLibraryOpen(false);
      } catch (err) { console.error("Format invalide"); }
    };
    reader.readAsText(file);
    e.target.value = null; 
  }, [saveHistory]);

  const deleteSelected = useCallback(() => {
    saveHistory();
    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
    setWires(prev => prev.filter(w => !selectedWireIds.includes(w.id)));
    setSelectedIds([]); setSelectedWireIds([]);
  }, [saveHistory, selectedIds, selectedWireIds]);

  const flipSelected = useCallback(() => {
    saveHistory();
    setElements(p => p.map(el => selectedIds.includes(el.id) ? { ...el, flipX: !el.flipX } : el));
  }, [saveHistory, selectedIds]);

  const rotateSelected = useCallback(() => {
    saveHistory();
    setElements(p => p.map(el => selectedIds.includes(el.id) ? { ...el, rotation: (el.rotation + 90) % 360 } : el));
  }, [saveHistory, selectedIds]);

  const copyElements = useCallback(() => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter(el => selectedIds.includes(el.id));
    setClipboard(JSON.stringify(selected));
  }, [elements, selectedIds]);

  const pasteElements = useCallback(() => {
    if (!clipboard) return;
    saveHistory();
    const parsed = JSON.parse(clipboard);
    const newElements = parsed.map(el => ({
      ...el,
      id: Date.now() + Math.random(),
      x: el.x + 30,
      y: el.y + 30
    }));
    setElements(prev => [...prev, ...newElements]);
    setSelectedIds(newElements.map(el => el.id));
    setSelectedWireIds([]);
  }, [clipboard, saveHistory]);

  const getElementPins = useCallback((el) => {
    const pins = [];
    const f = el.flipX ? -1 : 1;
    const rad = (el.rotation || 0) * Math.PI / 180;
    const rotate = (px, py) => {
      const fx = px * f;
      return {
        x: Math.round((el.x + fx * Math.cos(rad) - py * Math.sin(rad)) / 10) * 10,
        y: Math.round((el.y + fx * Math.sin(rad) + py * Math.cos(rad)) / 10) * 10
      };
    };

    switch (el.type) {
      case COMPONENT_TYPES.NMOS:
      case COMPONENT_TYPES.PMOS: pins.push(rotate(-40, 0), rotate(10, -40), rotate(10, 40)); break;
      case COMPONENT_TYPES.NPN:
      case COMPONENT_TYPES.PNP: pins.push(rotate(-30, -5), rotate(10, -25), rotate(10, 25)); break;
      case COMPONENT_TYPES.RES:
      case COMPONENT_TYPES.CAP:
      case COMPONENT_TYPES.IND:
      case COMPONENT_TYPES.Z:
      case COMPONENT_TYPES.DIO: pins.push(rotate(0, -40), rotate(0, 40)); break;
      case COMPONENT_TYPES.VDD: pins.push({ x: el.x, y: el.y + 20 }); break;
      case COMPONENT_TYPES.VSS:
      case COMPONENT_TYPES.GND: pins.push({ x: el.x, y: el.y - 30 }); break; 
      case COMPONENT_TYPES.OPAMP: pins.push(rotate(-40, -20), rotate(-40, 20), rotate(40, 0)); break;
      case COMPONENT_TYPES.AND:
      case COMPONENT_TYPES.NAND:
      case COMPONENT_TYPES.OR:
      case COMPONENT_TYPES.NOR:
      case COMPONENT_TYPES.XOR: pins.push(rotate(-40, -10), rotate(-40, 10), rotate(40, 0)); break;
      case COMPONENT_TYPES.NOT: pins.push(rotate(-40, 0), rotate(40, 0)); break;
      case COMPONENT_TYPES.VOLTAGE: pins.push({ x: el.x, y: el.y - (el.height||60)/2 }, { x: el.x, y: el.y + (el.height||60)/2 }); break;
      case COMPONENT_TYPES.BUS:
        pins.push({ x: el.x - (el.width||200)/2, y: el.y }, { x: el.x + (el.width||200)/2, y: el.y }); break;
      default: break;
    }
    return pins;
  }, []);

  const getClosestPin = useCallback((px, py) => {
    let closest = null;
    let minDist = 20;
    elements.forEach(el => {
      getElementPins(el).forEach(pin => {
        const d = Math.sqrt((px - pin.x) ** 2 + (py - pin.y) ** 2);
        if (d < minDist) { minDist = d; closest = pin; }
      });
    });
    return closest;
  }, [elements, getElementPins]);

  const activeElement = useMemo(() => elements.find(el => el.id === selectedIds[0]), [elements, selectedIds]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); undo(); return; }
        if (e.key === 'y') { e.preventDefault(); redo(); return; }
        if (e.key === 's') { e.preventDefault(); saveProject(); return; }
        if (e.key === 'c') { e.preventDefault(); copyElements(); return; }
        if (e.key === 'v') { e.preventDefault(); pasteElements(); return; }
      }
      if (e.code === 'Space') { e.preventDefault(); setSelectedTool('SELECT'); return; }
      
      const key = e.key.toLowerCase();
      switch (key) {
        case 'b': setIsLibraryOpen(true); break;
        case 'n': setSelectedTool(COMPONENT_TYPES.NMOS); break;
        case 'p': setSelectedTool(COMPONENT_TYPES.PMOS); break;
        case 'r': setSelectedTool(COMPONENT_TYPES.RES); break;
        case 'c': setSelectedTool(COMPONENT_TYPES.CAP); break;
        case 'l': setSelectedTool(COMPONENT_TYPES.IND); break;
        case 'v': setSelectedTool(COMPONENT_TYPES.VDD); break;
        case 's': setSelectedTool(COMPONENT_TYPES.VSS); break;
        case 'g': setSelectedTool(COMPONENT_TYPES.GND); break;
        case 'u': setSelectedTool(COMPONENT_TYPES.VOLTAGE); break;
        case 'a': setSelectedTool(COMPONENT_TYPES.OPAMP); break;
        case 'z': setSelectedTool(COMPONENT_TYPES.Z); break;
        case 'q': setSelectedTool(COMPONENT_TYPES.BOX); break;
        case 'w': setSelectedTool(COMPONENT_TYPES.WIRE); break;
        case 'e': setSelectedTool(COMPONENT_TYPES.PIN); break;
        case 'f': flipSelected(); break;
        case 'delete': case 'backspace': deleteSelected(); break;
        case 'escape': 
            setIsLibraryOpen(false); setSelectedTool('SELECT'); 
            setSelectedIds([]); setSelectedWireIds([]); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, undo, redo, deleteSelected, flipSelected, saveProject, copyElements, pasteElements, isLibraryOpen]);

  const drawShape = (ctx, el, isS, currentZoom) => {
    const col = isS ? '#3b82f6' : (el.color || '#1e293b');
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5 / currentZoom;
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    ctx.save();
    ctx.translate(el.x, el.y);
    if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
    if (el.flipX) ctx.scale(-1, 1);

    ctx.beginPath();
    switch (el.type) {
      case COMPONENT_TYPES.NMOS:
      case COMPONENT_TYPES.PMOS:
        ctx.moveTo(-40, 0); 
        if (el.type === COMPONENT_TYPES.PMOS) { ctx.lineTo(-24, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(-20, 0, 4, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); }
        else ctx.lineTo(-14, 0);
        ctx.moveTo(-14, -15); ctx.lineTo(-14, 15);
        ctx.moveTo(-8, -15); ctx.lineTo(-8, 15);
        ctx.moveTo(-8, -10); ctx.lineTo(10, -10); ctx.lineTo(10, -40);
        ctx.moveTo(-8, 10); ctx.lineTo(10, 10); ctx.lineTo(10, 40);
        break;
      case COMPONENT_TYPES.NPN:
      case COMPONENT_TYPES.PNP:
        ctx.translate(0, 5); 
        ctx.arc(0, 0, 20, 0, Math.PI * 2); 
        ctx.moveTo(-10, -10); ctx.lineTo(-10, 10);
        ctx.lineWidth = 4 / currentZoom; ctx.stroke(); ctx.lineWidth = 2.5 / currentZoom; ctx.beginPath();
        ctx.moveTo(-30, -5); ctx.lineTo(-10, -5); 
        ctx.moveTo(-10, -6); ctx.lineTo(10, -25); 
        ctx.moveTo(-10, 6); ctx.lineTo(10, 25); 
        if (el.type === COMPONENT_TYPES.NPN) {
            ctx.moveTo(3, 16); ctx.lineTo(10, 25); ctx.lineTo(1, 23); ctx.closePath(); ctx.fill();
        } else {
            ctx.moveTo(-5, 8); ctx.lineTo(1, 14); ctx.lineTo(-8, 16); ctx.closePath(); ctx.fill();
        }
        break;
      case COMPONENT_TYPES.RES:
        ctx.moveTo(0, -40); ctx.lineTo(0, -20);
        for(let i=0; i<5; i++) { ctx.lineTo(8, -15 + i*8); ctx.lineTo(-8, -11 + i*8); }
        ctx.lineTo(0, 20); ctx.lineTo(0, 40);
        break;
      case COMPONENT_TYPES.CAP:
        ctx.moveTo(0, -40); ctx.lineTo(0, -5); ctx.moveTo(-15, -5); ctx.lineTo(15, -5);
        ctx.moveTo(-15, 5); ctx.lineTo(15, 5); ctx.moveTo(0, 5); ctx.lineTo(0, 40);
        break;
      case COMPONENT_TYPES.IND:
        ctx.moveTo(0, -40); ctx.lineTo(0, -20);
        for(let i=0; i<4; i++) { ctx.arc(4, -12 + i*8, 6, -Math.PI/2, Math.PI/2, false); }
        ctx.lineTo(0, 20); ctx.lineTo(0, 40);
        break;
      case COMPONENT_TYPES.Z:
        ctx.moveTo(0, -40); ctx.lineTo(0, -15);
        ctx.rect(-10, -15, 20, 30);
        ctx.moveTo(0, 15); ctx.lineTo(0, 40);
        break;
      case COMPONENT_TYPES.DIO:
        ctx.moveTo(0, -40); ctx.lineTo(0, -10);
        ctx.moveTo(-15, -10); ctx.lineTo(15, -10); ctx.lineTo(0, 10); ctx.lineTo(-15, -10);
        ctx.moveTo(-15, 10); ctx.lineTo(15, 10);
        ctx.moveTo(0, 10); ctx.lineTo(0, 40);
        break;
      case COMPONENT_TYPES.VDD:
        ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(0, 0); ctx.lineTo(0, 20); break;
      case COMPONENT_TYPES.VSS:
        ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(0, 0); ctx.lineTo(0, -20); break;
      case COMPONENT_TYPES.GND:
        ctx.moveTo(0, 0); ctx.lineTo(0, -30); 
        ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.moveTo(-10, 5); ctx.lineTo(10, 5); ctx.moveTo(-5, 10); ctx.lineTo(5, 10); break;
      case COMPONENT_TYPES.BUS:
        ctx.lineWidth = 6 / currentZoom; 
        const bw = (el.width||200)/2;
        ctx.moveTo(-bw, 0); ctx.lineTo(bw, 0); 
        if (isS) { 
          ctx.stroke(); ctx.beginPath(); ctx.fillStyle = "#fff"; ctx.lineWidth = 1/currentZoom;
          ctx.arc(-bw, 0, 4/currentZoom, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath();
          ctx.arc(bw, 0, 4/currentZoom, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }
        break;
      case COMPONENT_TYPES.VDC:
      case COMPONENT_TYPES.VAC:
        ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.moveTo(0, -25); ctx.lineTo(0, -15); ctx.moveTo(0, 15); ctx.lineTo(0, 25);
        if(el.type === COMPONENT_TYPES.VDC) {
            ctx.stroke(); ctx.beginPath(); ctx.font = `bold ${10/currentZoom}px Inter`; ctx.textAlign="center";
            ctx.fillText("+", 0, -3); ctx.fillText("-", 0, 14);
        } else {
            ctx.moveTo(-8, 0); ctx.bezierCurveTo(-4, -8, 4, 8, 8, 0);
        }
        break;
      case COMPONENT_TYPES.OPAMP:
        ctx.moveTo(-40, -20); ctx.lineTo(-20, -20); ctx.moveTo(-40, 20); ctx.lineTo(-20, 20);
        ctx.moveTo(-20, -35); ctx.lineTo(-20, 35); ctx.lineTo(30, 0); ctx.closePath();
        ctx.moveTo(30, 0); ctx.lineTo(40, 0);
        ctx.stroke(); ctx.beginPath(); ctx.font = `bold ${11/currentZoom}px Inter`; ctx.textAlign="left";
        ctx.fillText("-", -15, -18); ctx.fillText("+", -15, 25);
        break;
      case COMPONENT_TYPES.AND:
      case COMPONENT_TYPES.NAND:
        ctx.moveTo(-40, -10); ctx.lineTo(-20, -10);
        ctx.moveTo(-40, 10); ctx.lineTo(-20, 10);
        ctx.moveTo(-20, -25); ctx.lineTo(0, -25);
        ctx.arc(0, 0, 25, -Math.PI/2, Math.PI/2, false);
        ctx.lineTo(-20, 25); ctx.closePath();
        if (el.type === COMPONENT_TYPES.NAND) {
            ctx.stroke(); ctx.beginPath(); ctx.arc(30, 0, 5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath();
            ctx.moveTo(35, 0); ctx.lineTo(40, 0);
        } else { ctx.moveTo(25, 0); ctx.lineTo(40, 0); }
        break;
      case COMPONENT_TYPES.OR:
      case COMPONENT_TYPES.NOR:
      case COMPONENT_TYPES.XOR:
        ctx.moveTo(-40, -10); ctx.lineTo(-22, -10);
        ctx.moveTo(-40, 10); ctx.lineTo(-22, 10);
        if (el.type === COMPONENT_TYPES.XOR) {
          ctx.moveTo(-30, -25); ctx.quadraticCurveTo(-15, 0, -30, 25); ctx.stroke(); ctx.beginPath();
        }
        ctx.moveTo(-25, -25);
        ctx.quadraticCurveTo(-10, 0, -25, 25);
        ctx.quadraticCurveTo(10, 25, 25, 0);
        ctx.quadraticCurveTo(10, -25, -25, -25);
        if (el.type === COMPONENT_TYPES.NOR) {
            ctx.stroke(); ctx.beginPath(); ctx.arc(30, 0, 5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath();
            ctx.moveTo(35, 0); ctx.lineTo(40, 0);
        } else { ctx.moveTo(25, 0); ctx.lineTo(40, 0); }
        break;
      case COMPONENT_TYPES.NOT:
        ctx.moveTo(-40, 0); ctx.lineTo(-20, 0);
        ctx.moveTo(-20, -20); ctx.lineTo(-20, 20); ctx.lineTo(10, 0); ctx.closePath();
        ctx.stroke(); ctx.beginPath(); ctx.arc(15, 0, 5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath();
        ctx.moveTo(20, 0); ctx.lineTo(40, 0);
        break;
      case COMPONENT_TYPES.VOLTAGE:
        const vh = (el.height||60)/2;
        ctx.moveTo(0, vh); ctx.lineTo(0, -vh); 
        ctx.moveTo(-6, -vh + 10); ctx.lineTo(0, -vh); ctx.lineTo(6, -vh + 10);
        if (isS) { 
          ctx.stroke(); ctx.beginPath(); ctx.fillStyle = "#fff"; ctx.lineWidth = 1/currentZoom;
          ctx.arc(0, -vh, 4/currentZoom, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath();
          ctx.arc(0, vh, 4/currentZoom, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        }
        ctx.stroke(); ctx.beginPath(); ctx.font = `bold ${14/currentZoom}px Inter`; ctx.textAlign="center";
        ctx.fillText("+", 0, -vh - 5); ctx.fillText("-", 0, vh + 18); break;
      case COMPONENT_TYPES.BOX:
        ctx.beginPath(); 
        if (el.isDashed) ctx.setLineDash([15/currentZoom, (el.dashGap || 10)/currentZoom]);
        ctx.rect(-(el.width||200)/2, -(el.height||150)/2, el.width||200, el.height||150);
        ctx.stroke(); ctx.setLineDash([]); break;
      case COMPONENT_TYPES.PIN:
        ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); break;
      default: break;
    }
    ctx.stroke();
    ctx.restore();

    if (el.label || el.params) {
      if (el.type === COMPONENT_TYPES.OPAMP) return;
      const fs = 11 / currentZoom;
      ctx.font = `600 ${fs}px Inter`;
      ctx.fillStyle = isS ? '#3b82f6' : (el.color || '#1e293b');
      const rad = (el.rotation || 0) * Math.PI / 180;
      const f = el.flipX ? -1 : 1;
      let lx = 0, ly = 0, align = "center";
      switch (el.type) {
        case COMPONENT_TYPES.VDD: ly = -15; break;
        case COMPONENT_TYPES.VSS: ly = 25; break;
        case COMPONENT_TYPES.GND: lx = 35 * f; align = f === 1 ? "left" : "right"; break;
        case COMPONENT_TYPES.NMOS:
        case COMPONENT_TYPES.PMOS:
        case COMPONENT_TYPES.NPN:
        case COMPONENT_TYPES.PNP: lx = 40 * f; ly = -35; align = f === 1 ? "left" : "right"; break;
        case COMPONENT_TYPES.RES:
        case COMPONENT_TYPES.CAP: lx = 25 * f; ly = 5; align = f === 1 ? "left" : "right"; break;
        case COMPONENT_TYPES.BUS: lx = -(el.width||200)/2; ly = -15; align = "left"; break;
        case COMPONENT_TYPES.BOX: lx = -(el.width||200)/2; ly = -(el.height||150)/2 - 10; align = "left"; break;
        case COMPONENT_TYPES.VOLTAGE: lx = 25 * f; align = f === 1 ? "left" : "right"; break;
        default: lx = 25 * f; ly = 5; align = f === 1 ? "left" : "right";
      }
      const rx = lx * Math.cos(rad) - ly * Math.sin(rad);
      const ry = lx * Math.sin(rad) + ly * Math.cos(rad);
      ctx.textAlign = align;
      ctx.fillText(el.label || '', el.x + rx, el.y + ry);
      if (el.params && el.showParams) { 
        ctx.font = `italic 600 ${9/currentZoom}px JetBrains Mono`;
        ctx.fillStyle = "#64748b";
        const pStr = Object.entries(el.params).map(([k,v]) => `${k}=${v}`).join(' ');
        ctx.fillText(pStr, el.x + rx, el.y + ry + (14/currentZoom));
      }
    }
  };

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(-pan.x/zoom, -pan.y/zoom, canvas.width/zoom, canvas.height/zoom);
    if (showGrid) {
      ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1/zoom;
      const sX = -pan.x/zoom, sY = -pan.y/zoom, eX = (canvas.width-pan.x)/zoom, eY = (canvas.height-pan.y)/zoom;
      for(let i=Math.floor(sX/GRID_SIZE)*GRID_SIZE; i<=eX; i+=GRID_SIZE) { ctx.beginPath(); ctx.moveTo(i, sY); ctx.lineTo(i, eY); ctx.stroke(); }
      for(let i=Math.floor(sY/GRID_SIZE)*GRID_SIZE; i<=eY; i+=GRID_SIZE) { ctx.beginPath(); ctx.moveTo(sX, i); ctx.lineTo(eX, i); ctx.stroke(); }
    }

    // --- ALGORITHME DE DÉTECTION DE NŒUDS (JONCTIONS) ---
    const points = new Map();
    const registerPoint = (x, y, isEnd) => {
      const key = `${x},${y}`;
      const data = points.get(key) || { endCount: 0, midSegments: 0, pinCount: 0 };
      if (isEnd) data.endCount++;
      points.set(key, data);
    };

    wires.forEach(w => {
      registerPoint(w.x1, w.y1, true);
      registerPoint(w.x2, w.y2, true);
      // On teste si des points existants sont sur l'intérieur des segments de ce fil
      points.forEach((data, key) => {
        const [px, py] = key.split(',').map(Number);
        const onH = py === w.y1 && px > Math.min(w.x1, w.x2) && px < Math.max(w.x1, w.x2);
        const onV = px === w.x2 && py > Math.min(w.y1, w.y2) && py < Math.max(w.y1, w.y2);
        if (onH || onV) data.midSegments++;
      });
    });

    elements.forEach(el => {
      getElementPins(el).forEach(p => {
        const key = `${p.x},${p.y}`;
        const data = points.get(key) || { endCount: 0, midSegments: 0, pinCount: 0 };
        data.pinCount++;
        points.set(key, data);
      });
    });

    wires.forEach(w => {
      const isS = selectedWireIds.includes(w.id);
      ctx.strokeStyle = isS ? '#3b82f6' : (w.color || '#1e293b'); ctx.lineWidth = (isS?3:2.2)/zoom;
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
    });

    // Dessin des Jonctions (Dots)
    points.forEach((data, key) => {
      const total = data.endCount + data.pinCount + data.midSegments;
      // Dot si 3+ connexions OR si un fil s'arrête sur le milieu d'un autre fil (T-Junction)
      if (total >= 3 || (data.midSegments > 0 && (data.endCount > 0 || data.pinCount > 0))) {
        const [jx, jy] = key.split(',').map(Number);
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.arc(jx, jy, 3.5/zoom, 0, Math.PI * 2); ctx.fill();
      }
    });

    if (tempWire) { 
      ctx.strokeStyle = '#3b82f6'; ctx.setLineDash([4/zoom, 4/zoom]); ctx.beginPath();
      ctx.moveTo(tempWire.x1, tempWire.y1); ctx.lineTo(tempWire.x2, tempWire.y1); ctx.lineTo(tempWire.x2, tempWire.y2);
      ctx.stroke(); ctx.setLineDash([]); 
    }
    if (tempBox) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.6)"; ctx.setLineDash([5/zoom, 5/zoom]);
      ctx.strokeRect(tempBox.x, tempBox.y, tempBox.w, tempBox.h); ctx.setLineDash([]);
    }
    if (tempBus) {
        ctx.strokeStyle = "rgba(99, 102, 241, 0.6)"; ctx.lineWidth = 6/zoom;
        ctx.beginPath(); ctx.moveTo(tempBus.x1, tempBus.y1); ctx.lineTo(tempBus.x2, tempBus.y1); ctx.stroke();
    }
    elements.forEach(el => drawShape(ctx, el, selectedIds.includes(el.id), zoom));
    if (selectionRect) { 
      ctx.strokeStyle = '#3b82f6'; ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; 
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h); 
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h); 
    }
    ctx.restore();
  }, [elements, wires, tempWire, tempBox, tempBus, selectedIds, selectedWireIds, selectionRect, zoom, pan, showGrid, getElementPins, selectedTool]);

  useEffect(() => { drawAll(); }, [drawAll]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    const snapped = getClosestPin(rawX, rawY) || { x: Math.round(rawX / 10) * 10, y: Math.round(rawY / 10) * 10 };
    const { x, y } = snapped;

    if (e.button === 1 || selectedTool === 'MOVE') { setIsPanning(true); return; }

    if (selectedTool === 'SELECT') {
      const resizerEl = elements.find(el => {
        if (!selectedIds.includes(el.id)) return false;
        if (el.type === COMPONENT_TYPES.BUS) {
          const hw = (el.width || 200) / 2;
          if (Math.abs(el.y - rawY) < 15) {
            if (Math.abs(el.x - hw - rawX) < 15) return { id: el.id, side: 'end' };
            if (Math.abs(el.x + hw - rawX) < 15) return { id: el.id, side: 'start' };
          }
        }
        if (el.type === COMPONENT_TYPES.VOLTAGE) {
          const hh = (el.height || 60) / 2;
          if (Math.abs(el.x - rawX) < 15) {
            if (Math.abs(el.y - hh - rawY) < 15) return { id: el.id, side: 'end' };
            if (Math.abs(el.y + hh - rawY) < 15) return { id: el.id, side: 'start' };
          }
        }
        return false;
      });

      if (resizerEl) {
        const found = elements.find(el => el.id === resizerEl.id);
        const hw = (found.width || 200) / 2;
        const hh = (found.height || 60) / 2;
        let side = found.type === COMPONENT_TYPES.BUS ? (Math.abs(found.x - hw - rawX) < 15 ? 'end' : 'start') : (Math.abs(found.y - hh - rawY) < 15 ? 'end' : 'start');
        saveHistory(); setResizingElement({ id: found.id, side }); return;
      }

      const clickedEl = elements.find(el => {
        if (el.type === COMPONENT_TYPES.BUS) {
          const hw = (el.width || 200) / 2;
          return Math.abs(el.x - rawX) < hw && Math.abs(el.y - rawY) < 15;
        }
        if (el.type === COMPONENT_TYPES.VOLTAGE) {
          const hh = (el.height || 60) / 2;
          return Math.abs(el.x - rawX) < 15 && Math.abs(el.y - rawY) < hh;
        }
        if (el.type === COMPONENT_TYPES.BOX) {
          const hw = (el.width || 200) / 2;
          const hh = (el.height || 150) / 2;
          return Math.abs(el.x - rawX) < hw && Math.abs(el.y - rawY) < hh;
        }
        return Math.abs(el.x - rawX) < 30 && Math.abs(el.y - rawY) < 30;
      });

      if (clickedEl) {
        saveHistory(); setDraggingElement(clickedEl.id);
        if (!e.shiftKey && !selectedIds.includes(clickedEl.id)) { setSelectedIds([clickedEl.id]); setSelectedWireIds([]); }
        else if (e.shiftKey) setSelectedIds(p => p.includes(clickedEl.id) ? p.filter(i => i !== clickedEl.id) : [...p, clickedEl.id]);
        return;
      }
      const getDist = (px, py, x1, y1, x2, y2) => {
        const l2 = (x1 - x2) ** 2 + (y1 - y2) ** 2;
        if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        let t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
        return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
      };
      const clickedWire = wires.find(w => Math.min(getDist(rawX, rawY, w.x1, w.y1, w.x2, w.y1), getDist(rawX, rawY, w.x2, w.y1, w.x2, w.y2)) < 8);
      if (clickedWire) { setSelectedWireIds([clickedWire.id]); setSelectedIds([]); return; }
      setSelectionRect({ x: rawX, y: rawY, w: 0, h: 0, originX: rawX, originY: rawY });
      return;
    }

    if (selectedTool === COMPONENT_TYPES.WIRE) { saveHistory(); setWireStart({ x, y }); return; }
    if (selectedTool === COMPONENT_TYPES.BOX) { setBoxStart({ x: rawX, y: rawY }); return; }
    if (selectedTool === COMPONENT_TYPES.BUS) { setBusStart({ x: rawX, y: rawY }); return; }

    saveHistory();
    const libraryItem = LIBRARY.flatMap(c => c.items).find(i => i.type === selectedTool);
    const defLabel = (selectedTool === COMPONENT_TYPES.VDD) ? 'Vdd' : 
                     (selectedTool === COMPONENT_TYPES.VSS) ? 'Vss' : 
                     (selectedTool === COMPONENT_TYPES.RES) ? 'R' : 
                     (selectedTool === COMPONENT_TYPES.CAP) ? 'C' : 
                     (selectedTool === COMPONENT_TYPES.IND) ? 'L' : 
                     (selectedTool === COMPONENT_TYPES.VOLTAGE) ? 'U' :
                     (selectedTool === COMPONENT_TYPES.Z) ? 'Z' :
                     (selectedTool === COMPONENT_TYPES.NPN || selectedTool === COMPONENT_TYPES.PNP) ? 'Q' : '';
                     
    setElements([...elements, { 
      id: Date.now() + Math.random(), type: selectedTool, x, y, label: defLabel, rotation: 0, flipX: false, color: '#000000', 
      showParams: false, params: libraryItem?.params ? {...libraryItem.params} : {},
      fontSize: 14, isBold: false, isItalic: false, width: selectedTool === COMPONENT_TYPES.BUS ? 200 : 200, height: selectedTool === COMPONENT_TYPES.VOLTAGE ? 60 : 150, isDashed: true, dashGap: 10
    }]);
    setSelectedIds([Date.now()]);
  };

  const handleMouseMove = (e) => {
    if (isPanning) { setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY })); return; }
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom, rawY = (e.clientY - rect.top - pan.y) / zoom;
    const snapped = getClosestPin(rawX, rawY) || { x: Math.round(rawX/10)*10, y: Math.round(rawY/10)*10 };
    const { x, y } = snapped;

    if (resizingElement) {
      setElements(prev => prev.map(el => {
        if (el.id !== resizingElement.id) return el;
        if (el.type === COMPONENT_TYPES.BUS) return { ...el, width: Math.max(Math.abs(x - el.x) * 2, 20) };
        if (el.type === COMPONENT_TYPES.VOLTAGE) return { ...el, height: Math.max(Math.abs(y - el.y) * 2, 20) };
        return el;
      }));
      return;
    }

    if (draggingElement && selectedTool === 'SELECT') {
      const target = elements.find(el => el.id === draggingElement);
      const dx = x - target.x, dy = y - target.y;
      if (dx === 0 && dy === 0) return;
      const connected = wires.map(w => ({ id: w.id, c1: elements.some(el => selectedIds.includes(el.id) && getElementPins(el).some(p => p.x === w.x1 && p.y === w.y1)), c2: elements.some(el => selectedIds.includes(el.id) && getElementPins(el).some(p => p.x === w.x2 && p.y === w.y2)) }));
      setElements(p => p.map(el => selectedIds.includes(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el));
      setWires(p => p.map(w => { const i = connected.find(n => n.id === w.id); return i ? { ...w, x1: i.c1 ? w.x1 + dx : w.x1, y1: i.c1 ? w.y1 + dy : w.y1, x2: i.c2 ? w.x2 + dx : w.x2, y2: i.c2 ? w.y2 + dy : w.y2 } : w; }));
    }
    if (selectionRect) setSelectionRect(p => ({ ...p, x: Math.min(rawX, p.originX), y: Math.min(rawY, p.originY), w: Math.abs(rawX - p.originX), h: Math.abs(rawY - p.originY) }));
    if (wireStart) setTempWire({ x1: wireStart.x, y1: wireStart.y, x2: x, y2: y });
    if (boxStart) setTempBox({ x: Math.min(rawX, boxStart.x), y: Math.min(rawY, boxStart.y), w: Math.abs(rawX - boxStart.x), h: Math.abs(rawY - boxStart.y) });
    if (busStart) setTempBus({ x1: busStart.x, y1: busStart.y, x2: rawX });
  };

  const handleMouseUp = () => {
    if (selectionRect) {
      const r = { x1: Math.min(selectionRect.x, selectionRect.x + selectionRect.w), x2: Math.max(selectionRect.x, selectionRect.x + selectionRect.w), y1: Math.min(selectionRect.y, selectionRect.y + selectionRect.h), y2: Math.max(selectionRect.y, selectionRect.y + selectionRect.h) };
      const elIds = elements.filter(el => el.x >= r.x1 && el.x <= r.x2 && el.y >= r.y1 && el.y <= r.y2).map(e => e.id);
      const wireIds = wires.filter(w => (w.x1 >= r.x1 && w.x1 <= r.x2 && w.y1 >= r.y1 && w.y1 <= r.y2) && (w.x2 >= r.x1 && w.x2 <= r.x2 && w.y2 >= r.y1 && w.y2 <= r.y2)).map(w => w.id);
      setSelectedIds(elIds); setSelectedWireIds(wireIds);
      setSelectionRect(null);
    }
    if (tempBox) {
      saveHistory(); setElements([...elements, { id: Date.now() + Math.random(), type: COMPONENT_TYPES.BOX, x: tempBox.x + tempBox.w/2, y: tempBox.y + tempBox.h/2, width: tempBox.w, height: tempBox.h, label: 'Bloc', color: '#3b82f6', isDashed: true, dashGap: 10, showParams: false }]);
      setBoxStart(null); setTempBox(null); setSelectedTool('SELECT');
    }
    if (tempBus) {
        saveHistory(); setElements([...elements, { id: Date.now() + Math.random(), type: COMPONENT_TYPES.BUS, x: tempBus.x1 + (tempBus.x2 - tempBus.x1)/2, y: tempBus.y1, width: Math.abs(tempBus.x2 - tempBus.x1), label: 'Vdd', color: '#1e293b', showParams: false }]);
        setBusStart(null); setTempBus(null); setSelectedTool('SELECT');
    }
    if (tempWire && (tempWire.x1 !== tempWire.x2 || tempWire.y1 !== tempWire.y2)) setWires([...wires, { id: Date.now(), ...tempWire, color: '#1e293b' }]);
    setWireStart(null); setTempWire(null); setDraggingElement(null); setResizingElement(null); setIsPanning(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden select-none" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="stylesheet" href={FONT_LINK} />
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap size={22} className="text-indigo-600 fill-indigo-100" />
            <h1 className="text-lg font-black tracking-tighter uppercase italic text-slate-800">CIRCUIT<span className="text-indigo-600">PRO</span></h1>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
             <button onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)" className="p-1.5 hover:bg-white rounded-md text-slate-500 disabled:opacity-30 transition-all shadow-sm"><Undo2 size={16}/></button>
             <button onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)" className="p-1.5 hover:bg-white rounded-md text-slate-500 disabled:opacity-30 transition-all shadow-sm"><Redo2 size={16}/></button>
          </div>
          <input type="text" value={canvasTitle} onChange={(e) => setCanvasTitle(e.target.value)} className="bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-indigo-500 outline-none px-2 py-1 rounded text-sm font-bold w-48 text-slate-700 transition-all" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button onClick={copyElements} title="Copier (Ctrl+C)" className="p-1.5 hover:bg-white rounded-lg text-slate-600 active:scale-95 transition-all"><Copy size={16}/></button>
             <button onClick={pasteElements} title="Coller (Ctrl+V)" className="p-1.5 hover:bg-white rounded-lg text-slate-600 active:scale-95 transition-all"><ClipboardPaste size={16}/></button>
          </div>
          <button onClick={() => setIsSpiceModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-bold active:scale-95 transition-all shadow-sm"><FileCode size={16}/> Netlist</button>
          <div className="w-px h-6 bg-slate-200 mx-1"/>
          <button onClick={() => fileInputRef.current.click()} title="Charger JSON" className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 active:scale-95 transition-all"><Upload size={18} /></button>
          <input type="file" ref={fileInputRef} onChange={loadProject} accept=".json" className="hidden" />
          <button onClick={saveProject} title="Sauver (Ctrl+S)" className="p-2 hover:bg-slate-100 rounded-lg text-indigo-600 active:scale-95 transition-all"><Save size={18} /></button>
          <button onClick={() => { const c = canvasRef.current; const l = document.createElement('a'); l.download = `${canvasTitle}.png`; l.href = c.toDataURL(); l.click(); }} className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-black font-bold shadow-lg text-sm active:scale-95 transition-all"><Download size={16} /> Image</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-4 z-20 shadow-sm overflow-y-auto overflow-x-hidden scrollbar-hide">
          <ToolIcon active={selectedTool === 'SELECT'} onClick={() => setSelectedTool('SELECT')} icon={<MousePointer2 size={24}/>} title="Sélection" shortcut="Space" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.WIRE} onClick={() => setSelectedTool(COMPONENT_TYPES.WIRE)} icon={<Share2 size={22}/>} title="Fil" shortcut="W" />
          <div className="w-10 h-px bg-slate-100 my-1" />
          <ToolIcon active={isLibraryOpen} onClick={() => setIsLibraryOpen(true)} icon={<Box size={24}/>} title="Bibliothèque" shortcut="B" />
          <div className="w-10 h-px bg-slate-100 my-1" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.RES} onClick={() => setSelectedTool(COMPONENT_TYPES.RES)} icon={<span className="font-black text-xs">RES</span>} title="Résistance" shortcut="R" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.CAP} onClick={() => setSelectedTool(COMPONENT_TYPES.CAP)} icon={<span className="font-black text-xs">CAP</span>} title="Condensateur" shortcut="C" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.IND} onClick={() => setSelectedTool(COMPONENT_TYPES.IND)} icon={<Repeat size={20}/>} title="Inductance" shortcut="L" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.Z} onClick={() => setSelectedTool(COMPONENT_TYPES.Z)} icon={<span className="font-black text-xs">IMP</span>} title="Impédance" shortcut="Z" />
          <div className="w-10 h-px bg-slate-100 my-1" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.VDD} onClick={() => setSelectedTool(COMPONENT_TYPES.VDD)} icon={<ArrowUp size={20} className="text-red-500"/>} title="Vdd" shortcut="V" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.VSS} onClick={() => setSelectedTool(COMPONENT_TYPES.VSS)} icon={<ArrowDown size={20} className="text-blue-500"/>} title="Vss" shortcut="S" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.GND} onClick={() => setSelectedTool(COMPONENT_TYPES.GND)} icon={<div className="font-bold text-xl text-slate-700">⏚</div>} title="Masse" shortcut="G" />
          <div className="w-10 h-px bg-slate-100 my-1" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.OPAMP} onClick={() => setSelectedTool(COMPONENT_TYPES.OPAMP)} icon={<Activity size={20} className="text-orange-500"/>} title="AOP" shortcut="A" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.PIN} onClick={() => setSelectedTool(COMPONENT_TYPES.PIN)} icon={<Circle size={18} fill="currentColor" className="text-indigo-600"/>} title="Pin E/S" shortcut="E" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.VOLTAGE} onClick={() => setSelectedTool(COMPONENT_TYPES.VOLTAGE)} icon={<Activity size={20} className="text-indigo-600"/>} title="Mesure U" shortcut="U" />
          <div className="w-10 h-px bg-slate-100 my-1" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.BUS} onClick={() => setSelectedTool(COMPONENT_TYPES.BUS)} icon={<MoveHorizontal size={20} className="text-indigo-600"/>} title="Bus" />
          <ToolIcon active={selectedTool === COMPONENT_TYPES.BOX} onClick={() => setSelectedTool(COMPONENT_TYPES.BOX)} icon={<Square size={20} className="text-indigo-400"/>} title="Cadre" shortcut="Q" />
        </aside>

        <main className="flex-1 relative bg-[#f1f5f9] overflow-hidden">
          <canvas ref={canvasRef} width={window.innerWidth - 80} height={window.innerHeight - 52} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onWheel={(e) => { if(e.ctrlKey) { e.preventDefault(); setZoom(z => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.2), 5)); } else setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY })); }} className={`block touch-none bg-white ${selectedTool === 'MOVE' || isPanning ? 'cursor-grabbing' : resizingElement ? 'cursor-ew-resize' : 'cursor-crosshair'}`} />

          {isLibraryOpen && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
               <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><Box className="text-indigo-600"/> Bibliothèque</h2>
                    <button onClick={() => setIsLibraryOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>
                  <div className="p-8 grid grid-cols-4 gap-8 max-h-[70vh] overflow-y-auto scrollbar-hide">
                     {LIBRARY.map(cat => (
                       <div key={cat.category} className="space-y-4">
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">{cat.category}</h3>
                          <div className="space-y-2">
                             {cat.items.map(item => (
                               <button key={item.type} onClick={() => { setSelectedTool(item.type); setIsLibraryOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${selectedTool === item.type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'}`}>
                                  <span>{item.label}</span>
                                  {item.key && <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md uppercase">{item.key}</span>}
                               </button>
                             ))}
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeElement && (
            <div className="absolute top-6 right-6 w-80 bg-white rounded-3xl shadow-2xl p-6 border border-slate-200 animate-in slide-in-from-right-4 z-40">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings2 size={14}/> {activeElement.type}</h3>
                  <div className="flex gap-1">
                    <button onClick={flipSelected} title="Flip (F)" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"><FlipHorizontal size={16}/></button>
                    <button onClick={rotateSelected} title="Rotate" className="p-2 hover:bg-slate-100 rounded-xl text-slate-600"><RotateCw size={16}/></button>
                    <button onClick={deleteSelected} className="p-2 bg-red-50 text-red-500 rounded-xl shadow-sm hover:bg-red-100"><Trash2 size={16}/></button>
                  </div>
               </div>
               <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 scrollbar-hide">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Label</label>
                     <input type="text" value={activeElement.label || ''} onChange={(e) => updateParam(activeElement.id, 'label', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 ring-indigo-500" />
                  </div>
                  {activeElement.params && (
                    <div className="p-3 bg-slate-50 rounded-2xl space-y-3">
                       <div className="flex items-center justify-between">
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Affichage Schéma</label>
                         <button onClick={() => updateParam(activeElement.id, 'showParams', !activeElement.showParams)} title="Afficher/Masquer Valeur" className={`p-1.5 rounded-lg transition-all ${activeElement.showParams ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                            {activeElement.showParams ? <Eye size={14}/> : <EyeOff size={14}/>}
                         </button>
                       </div>
                       {Object.entries(activeElement.params).map(([key, val]) => (
                         <div key={key} className="flex items-center gap-2">
                           <span className="w-8 font-mono text-[10px] font-bold text-indigo-600 uppercase">{key}</span>
                           <input type="text" value={val} onChange={(e) => updateSubParam(activeElement.id, key, e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:ring-2 ring-indigo-200 outline-none" />
                         </div>
                       ))}
                    </div>
                  )}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Couleur</label>
                    <div className="flex gap-2">
                      {COLORS.map(c => ( <button key={c.value} onClick={() => { saveHistory(); setElements(elements.map(el => el.id === activeElement.id ? { ...el, color: c.value } : el)); }} className={`w-6 h-6 rounded-full border-2 ${activeElement.color === c.value ? 'border-indigo-600 scale-125 shadow-md' : 'border-transparent'}`} style={{ background: c.value }} /> ))}
                    </div>
                  </div>
               </div>
            </div>
          )}

          <div className="absolute bottom-6 right-6 flex items-center gap-4 bg-slate-900/90 text-white/60 px-5 py-2.5 rounded-full shadow-2xl text-[9px] font-bold uppercase backdrop-blur-md">
             <div className="flex items-center gap-1.5 text-indigo-400">
               <Zap size={12}/> R, L, C, Z, A, E, U, N, P, V, S, G, Q, W, F
             </div>
             <div className="w-px h-3 bg-white/10"/>
             <div>Ctrl+C / Ctrl+V / Ctrl+Z</div>
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-white/80 backdrop-blur p-2 rounded-2xl shadow-xl border border-slate-200">
             <div className="flex gap-0.5">
                <button onClick={() => setZoom(z => Math.min(z + 0.1, 4))} className="p-2 hover:bg-white rounded-xl text-slate-600 transition-all"><ZoomIn size={18}/></button>
                <button onClick={() => {setZoom(1); setPan({x:0, y:0});}} className="p-2 hover:bg-white rounded-xl text-slate-600 transition-all"><Maximize size={18}/></button>
                <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.3))} className="p-2 hover:bg-white rounded-xl text-slate-600 transition-all"><ZoomOut size={18}/></button>
             </div>
             <div className="w-px h-6 bg-slate-200 mx-1"/>
             <button onClick={() => setShowGrid(!showGrid)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${showGrid ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Grille</button>
          </div>
        </main>
      </div>

      {isSpiceModalOpen && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-12 animate-in zoom-in">
           <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full">
              <div className="px-8 py-6 border-b flex justify-between items-center bg-slate-50">
                <h2 className="text-xl font-black text-slate-800">SPICE Export</h2>
                <button onClick={() => setIsSpiceModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
              </div>
              <pre className="p-8 overflow-auto bg-slate-900 text-green-400 font-mono text-xs leading-relaxed flex-1 scrollbar-hide">
                * CIRCUIT PRO Design Export{'\n'}
                * CIRCUIT: {String(canvasTitle)}{'\n\n'}
                {elements.map(el => {
                  const p = el.params || {};
                  const n = String(el.label || `${el.type}_${el.id.toString().slice(-3)}`);
                  if (el.type === COMPONENT_TYPES.NMOS) return `M${n} d g s b nmos W=${p.W||'1u'} L=${p.L||'180n'}`;
                  if (el.type === COMPONENT_TYPES.RES) return `R${n} n1 n2 ${p.R||'10k'}`;
                  if (el.type === COMPONENT_TYPES.CAP) return `C${n} n1 n2 ${p.C||'1p'}`;
                  return null;
                }).filter(Boolean).join('\n')}
                {'\n\n'}.end
              </pre>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;