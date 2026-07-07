import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus, ChevronDown, ChevronUp, Edit2, Trash2, BookOpen,
  CheckCircle, X, Save, AlertTriangle, Image,
  List, AlignLeft, Layers, Tag, HelpCircle, Check,
  FolderOpen, Folder, Upload, Download, FileSpreadsheet, AlertCircle,
  ChevronRight, Database, MoreVertical, Calendar, ToggleLeft, Loader2,
  Users, UserCheck, Globe, ListOrdered, Boxes, MapPin, GripVertical, ArrowUp, ArrowDown,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { api } from '../../utils/api';
import { CATEGORIES, CATEGORY_META } from '../../utils/questionBank';

// ─── Category name → DB category key ─────────────────────────────────────
const NAME_TO_CAT = Object.fromEntries(
  CATEGORIES.map(cat => [CATEGORY_META[cat].label.toLowerCase(), cat])
);
CATEGORIES.forEach(cat => { NAME_TO_CAT[cat] = cat; });

function getCatFromName(name = '') {
  return NAME_TO_CAT[name.toLowerCase().trim()] || name.toLowerCase().trim() || CATEGORIES[0];
}

// ─── Normalizers ─────────────────────────────────────────────────────────
function normalizeOpt(opt) {
  return typeof opt === 'string' ? { text: opt, imageUrl: '' } : (opt || { text: '', imageUrl: '' });
}
function normalizePair(pair) {
  return {
    left: pair?.left || '', leftImage: pair?.leftImage || '',
    right: pair?.right || '', rightImage: pair?.rightImage || '',
  };
}
const flattenOptions = (opts) =>
  Array.isArray(opts) ? opts.map(o => (typeof o === 'string' ? o : (o?.text || ''))) : opts;
const flattenPairs = (pairs) =>
  Array.isArray(pairs) ? pairs.map(p => ({ left: p?.left || '', right: p?.right || '' })) : pairs;

// ─── Unique ID (temp, local only) ────────────────────────────────────────
let _seq = Date.now();
function uid(p = 'id') { return `${p}-${++_seq}`; }

// ─── Bank colour palette ──────────────────────────────────────────────────
const BANK_PALETTE = [
  { grad:'from-indigo-500 to-blue-600',   soft:'bg-indigo-50',   border:'border-indigo-200',  text:'text-indigo-700'   },
  { grad:'from-violet-500 to-purple-600', soft:'bg-violet-50',   border:'border-violet-200',  text:'text-violet-700'   },
  { grad:'from-rose-500 to-pink-600',     soft:'bg-rose-50',     border:'border-rose-200',    text:'text-rose-700'     },
  { grad:'from-emerald-500 to-teal-600',  soft:'bg-emerald-50',  border:'border-emerald-200', text:'text-emerald-700'  },
  { grad:'from-amber-500 to-orange-600',  soft:'bg-amber-50',    border:'border-amber-200',   text:'text-amber-700'    },
  { grad:'from-sky-500 to-cyan-600',      soft:'bg-sky-50',      border:'border-sky-200',     text:'text-sky-700'      },
];
const bankPal = (idx) => BANK_PALETTE[idx % BANK_PALETTE.length];

// ─── Level colour palette ─────────────────────────────────────────────────
const LEVEL_PALETTE = [
  { bg:'from-indigo-500 to-blue-500',   light:'bg-indigo-50',  border:'border-indigo-200',  text:'text-indigo-700'  },
  { bg:'from-violet-500 to-purple-500', light:'bg-violet-50',  border:'border-violet-200',  text:'text-violet-700'  },
  { bg:'from-emerald-500 to-teal-500',  light:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-700' },
  { bg:'from-amber-500 to-orange-500',  light:'bg-amber-50',   border:'border-amber-200',   text:'text-amber-700'   },
  { bg:'from-rose-500 to-pink-500',     light:'bg-rose-50',    border:'border-rose-200',    text:'text-rose-700'    },
  { bg:'from-sky-500 to-cyan-500',      light:'bg-sky-50',     border:'border-sky-200',     text:'text-sky-700'     },
];
const levelPal = (idx) => LEVEL_PALETTE[idx % LEVEL_PALETTE.length];

// ─── Question-type config ─────────────────────────────────────────────────
const Q_TYPES = [
  { value:'mcq',        label:'MCQ',                 icon:List,        sub:'4 options · text or image'      },
  { value:'match',      label:'Match the Following', icon:AlignLeft,   sub:'Pair matching · text or image'  },
  { value:'label',      label:'Label Question',      icon:Image,       sub:'Identify & label image parts'   },
  { value:'truefalse',  label:'True / False',        icon:ToggleLeft,  sub:'2 options · True or False'      },
  { value:'order',      label:'Arrange in Order',    icon:ListOrdered, sub:'Drag steps into correct order'  },
  { value:'categorize', label:'Group into Categories', icon:Boxes,     sub:'Drag items into buckets'        },
  { value:'hotspot',    label:'Label the Image',     icon:MapPin,      sub:'Drag labels onto image spots'   },
];
const DIFF_CFG = {
  easy:   { label:'Easy',   cls:'bg-green-100 text-green-700' },
  medium: { label:'Medium', cls:'bg-amber-100 text-amber-700' },
  hard:   { label:'Hard',   cls:'bg-red-100   text-red-700'   },
};

// ─── Applicable-For config ────────────────────────────────────────────────
const AF_CFG = {
  student: { label:'Students Only',           badge:'bg-indigo-100 text-indigo-700', border:'border-indigo-400', icon: Users     },
  trainer: { label:'Trainers Only',           badge:'bg-violet-100 text-violet-700', border:'border-violet-400', icon: UserCheck },
  both:    { label:'Both',                    badge:'bg-teal-100   text-teal-700',   border:'border-teal-400',   icon: Globe     },
};

// ─── Blank factories ──────────────────────────────────────────────────────
const blankOpt  = () => ({ text: '', imageUrl: '' });
const blankPair = () => ({ left: '', leftImage: '', right: '', rightImage: '' });
const blankMcq       = (af='student') => ({ type:'mcq',       text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[blankOpt(),blankOpt(),blankOpt(),blankOpt()], correct:null, explanation:'' });
const blankMatch     = (af='student') => ({ type:'match',     text:'', imageUrl:'', difficulty:'easy', applicableFor:af, pairs:[blankPair(),blankPair(),blankPair(),blankPair()], explanation:'' });
const blankLabel     = (af='student') => ({ type:'label',     text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[blankOpt(),blankOpt(),blankOpt(),blankOpt()], correct:null, explanation:'' });
const blankTrueFalse = (af='student') => ({ type:'truefalse', text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[{text:'True',imageUrl:''},{text:'False',imageUrl:''}], correct:null, explanation:'' });
// Ordering: options ARE the correct order (students see them shuffled).
const blankOrder     = (af='student') => ({ type:'order',      text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[blankOpt(),blankOpt(),blankOpt()], correct:0, explanation:'' });
// Categorize: extras.buckets (group names) + extras.items ({text,imageUrl,bucket}).
const blankCatItem   = () => ({ text:'', imageUrl:'', bucket:0 });
const blankCategorize= (af='student') => ({ type:'categorize', text:'', imageUrl:'', difficulty:'easy', applicableFor:af, correct:0, extras:{ buckets:['Group A','Group B'], items:[blankCatItem(),blankCatItem(),blankCatItem(),blankCatItem()] }, explanation:'' });
// Hotspot: question imageUrl + extras.hotspots ({x,y,label}).
const blankHotspot   = (af='student') => ({ type:'hotspot',    text:'', imageUrl:'', difficulty:'easy', applicableFor:af, correct:0, extras:{ hotspots:[] }, explanation:'' });
const blankForType   = (t, af='student') =>
  t==='match'      ? blankMatch(af)      :
  t==='label'      ? blankLabel(af)      :
  t==='truefalse'  ? blankTrueFalse(af)  :
  t==='order'      ? blankOrder(af)      :
  t==='categorize' ? blankCategorize(af) :
  t==='hotspot'    ? blankHotspot(af)    :
  blankMcq(af);

// ─── CSV parser (header-aware) ──────────────────────────────────────────────
// Columns are resolved by header NAME, not fixed position, so new columns
// (e.g. `category`) can be added anywhere without breaking older files.
const splitRow  = (row) => (row.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || []);
const cleanCell = (c='') => c.replace(/^"|"$/g,'').trim();
// Normalise a header cell to its bare key: lowercase, drop any "(hint)" suffix.
const normHeader = (h='') => cleanCell(h).toLowerCase().split('(')[0].trim().replace(/\s+/g,'_');

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const headerCells = splitRow(lines[0]).map(normHeader);
  const idx = {};
  headerCells.forEach((h, i) => { if (h && !(h in idx)) idx[h] = i; });

  const questions = [];
  const AF_VALUES   = ['student', 'trainer', 'both'];
  const VALID_CATS  = ['robotics', 'chemistry', 'physics', 'mathematics'];

  for (const row of lines.slice(1)) {
    const cols  = splitRow(row);
    const col   = (name) => cleanCell(cols[idx[name]] ?? '');
    const type  = col('type')?.toLowerCase();
    const text  = col('text');
    if (!text) continue;
    const diff          = ['easy','medium','hard'].includes(col('difficulty')) ? col('difficulty') : 'easy';
    const applicableFor = AF_VALUES.includes(col('applicable_for')?.toLowerCase()) ? col('applicable_for').toLowerCase() : 'student';
    const rawCat        = col('category')?.toLowerCase();
    // Blank/unknown category → '' so the import falls back to the target category's subject.
    const category      = VALID_CATS.includes(rawCat) ? rawCat : '';
    const base          = { id:uid('q'), text, difficulty:diff, applicableFor, category };

    if (type==='mcq')                         questions.push({ ...base, type:'mcq',   options:[col('opt_a'),col('opt_b'),col('opt_c'),col('opt_d')].map(t=>({text:t,imageUrl:''})), correct:Math.max(0,['A','B','C','D'].indexOf((col('correct')||'A').toUpperCase())), explanation:col('explanation')||'' });
    else if (type==='match')                  questions.push({ ...base, type:'match', pairs:[{left:col('p1_left'),leftImage:'',right:col('p1_right'),rightImage:''},{left:col('p2_left'),leftImage:'',right:col('p2_right'),rightImage:''},{left:col('p3_left'),leftImage:'',right:col('p3_right'),rightImage:''},{left:col('p4_left'),leftImage:'',right:col('p4_right'),rightImage:''}], explanation:'' });
    else if (type==='label'||type==='image')  questions.push({ ...base, type:'label', imageUrl:col('image_url')||'', options:[col('opt_a'),col('opt_b'),col('opt_c'),col('opt_d')].map(t=>({text:t,imageUrl:''})), correct:Math.max(0,['A','B','C','D'].indexOf((col('correct')||'A').toUpperCase())), explanation:col('explanation')||'' });
    else if (type==='truefalse'||type==='tf') {
      // `correct` column holds True/False (also accepts T/F or A/B). True = index 0.
      const c = col('correct').toLowerCase();
      const correct = (c==='false'||c==='f'||c==='b') ? 1 : 0;
      questions.push({ ...base, type:'truefalse',
        options:[{text:'True',imageUrl:''},{text:'False',imageUrl:''}], correct, explanation:col('explanation')||'' });
    }
    else if (type==='order') {
      // `steps` column: the steps in CORRECT order, separated by " | ".
      const steps = col('steps').split('|').map(s=>s.trim()).filter(Boolean);
      if (steps.length < 2) continue;
      questions.push({ ...base, type:'order',
        options: steps.map(s=>({text:s,imageUrl:''})), correct:0, explanation:col('explanation')||'' });
    }
    else if (type==='categorize') {
      // `groups` column: "Group1: a, b; Group2: c, d" — ';' splits groups,
      // ':' separates a group name from its comma-separated items.
      const buckets=[]; const items=[];
      col('groups').split(';').map(s=>s.trim()).filter(Boolean).forEach(group=>{
        const ci = group.indexOf(':'); if (ci < 0) return;
        const bname = group.slice(0,ci).trim(); if (!bname) return;
        const bidx = buckets.length; buckets.push(bname);
        group.slice(ci+1).split(',').map(s=>s.trim()).filter(Boolean)
          .forEach(it=>items.push({ text:it, imageUrl:'', bucket:bidx }));
      });
      if (buckets.length < 2 || items.length < 2) continue;
      questions.push({ ...base, type:'categorize',
        correct:0, extras:{ buckets, items }, explanation:col('explanation')||'' });
    }
    else if (type==='hotspot') {
      // `hotspots` column: "label@x,y; label@x,y" with x,y as % (0-100).
      // The base picture comes from the image_url column.
      const hotspots=[];
      col('hotspots').split(';').map(s=>s.trim()).filter(Boolean).forEach(h=>{
        const at = h.lastIndexOf('@'); if (at < 0) return;
        const label = h.slice(0,at).trim();
        const xy = h.slice(at+1).split(',').map(s=>parseFloat(s.trim()));
        if (!label || xy.length<2 || Number.isNaN(xy[0]) || Number.isNaN(xy[1])) return;
        hotspots.push({ x:xy[0], y:xy[1], label });
      });
      if (hotspots.length < 2) continue;
      questions.push({ ...base, type:'hotspot',
        imageUrl:col('image_url')||'', correct:0, extras:{ hotspots }, explanation:col('explanation')||'' });
    }
  }
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared UI helpers
// ═══════════════════════════════════════════════════════════════════════════
function Toast({ msg }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg animate-in slide-in-from-top-2">
      <CheckCircle size={14}/>{msg}
    </div>
  );
}

function DeleteModal({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title||'Confirm Delete'} size="sm"
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
      </>}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle size={18} className="text-red-500"/></div>
        <p className="text-slate-600 text-sm leading-relaxed pt-1">{message||'This action cannot be undone.'}</p>
      </div>
    </Modal>
  );
}

function InlineInput({ placeholder, onSave, onCancel, initial='' }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex items-center gap-2">
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter'&&val.trim()) onSave(val.trim()); if(e.key==='Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-xl border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"/>
      <button onClick={()=>val.trim()&&onSave(val.trim())} className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"><Check size={14}/></button>
      <button onClick={onCancel} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"><X size={14}/></button>
    </div>
  );
}

// ─── Image Upload ──────────────────────────────────────────────────────────
function ImageUpload({ value, onChange, compact = false, label = 'Image' }) {
  const [drag, setDrag]           = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');

  const process = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    setError('');
    try {
      const { id, presignedUrl, url } = await api.getPresignedUrl(file.name, file.type);
      await api.uploadToS3(presignedUrl, file);
      await api.confirmUpload(id);
      onChange(url);
    } catch (err) {
      setError('Upload failed');
      console.error('Image upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) return (
    <div className={`flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-xl ${compact ? 'h-14' : 'h-24'}`}>
      <Loader2 size={compact ? 12 : 16} className="animate-spin text-indigo-500"/>
      <span className={`font-semibold text-indigo-500 ${compact ? 'text-[9px]' : 'text-xs'}`}>Uploading…</span>
    </div>
  );

  if (value) return (
    <div className="space-y-1">
      <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
        <img src={value} alt={label} className={`w-full object-cover ${compact ? 'h-16' : 'h-28'}`}/>
        <button onClick={() => onChange('')} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100"><X size={9}/></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl cursor-pointer transition-all ${drag ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'} ${compact ? 'h-14' : 'h-24'}`}>
        <Upload size={compact ? 13 : 18} className={drag ? 'text-indigo-500' : 'text-slate-300'}/>
        <p className={`font-semibold text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{compact ? 'Add Image' : 'Upload Image'}</p>
        <input type="file" accept="image/*" className="hidden" onChange={e => process(e.target.files[0])}/>
      </label>
      {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Import Modal
// ═══════════════════════════════════════════════════════════════════════════
function ImportModal({ isOpen, onClose, levelName, categories, onImport }) {
  const [step,       setStep]       = useState('upload');
  const [parsed,     setParsed]     = useState([]);
  const [error,      setError]      = useState('');
  const [catId,      setCatId]      = useState(categories[0]?.id || '');
  const [newCatName, setNewCatName] = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState(null);

  const reset = () => { setStep('upload'); setParsed([]); setError(''); setCatId(categories[0]?.id || ''); setNewCatName(''); setResult(null); };

  const processFile = (f) => {
    if (!f) return;
    setError('');
    const isXlsx = f.name?.endsWith('.xlsx') || f.name?.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let csvText;
        if (isXlsx) {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          csvText = XLSX.utils.sheet_to_csv(ws);
        } else {
          csvText = e.target.result;
        }
        const qs = parseCSV(csvText);
        if (!qs.length) { setError('No valid questions found. Ensure the file matches the template.'); return; }
        setParsed(qs); setStep('preview');
      } catch { setError('Could not parse file. Ensure it matches the template format.'); }
    };
    if (isXlsx) reader.readAsArrayBuffer(f);
    else reader.readAsText(f);
  };

  const downloadTemplate = () => {
    // 23 columns. `category` (col 1) maps each question to a subject so it can be
    // filtered/grouped after import; leave it blank to inherit the target category.
    // Remaining columns: 2-18 are the original layout; 19-21 carry the drag-drop
    // types. Parsing is header-aware, so column order can change freely.
    const headers = ['type','category(robotics/chemistry/physics/mathematics)','text','difficulty','opt_a','opt_b','opt_c','opt_d','correct','explanation','image_url(img only)','p1_left','p1_right','p2_left','p2_right','p3_left','p3_right','p4_left','p4_right','applicable_for','steps(order: a|b|c)','groups(categorize: G1: a, b; G2: c, d)','hotspots(label@x,y; …  x,y are %)'];
    const E = ''; // filler for unused columns
    const rows = [
      ['mcq','robotics','What is a servo motor?','easy','A DC motor with feedback control','A stepper motor','A linear actuator','An AC induction motor','A','Servo motors use encoders for closed-loop position control.',E,E,E,E,E,E,E,E,E,'student',E,E,E],
      ['mcq','robotics','Which protocol is used for wireless robot communication?','hard','I2C','SPI','Bluetooth / Wi-Fi','UART','C','Bluetooth and Wi-Fi are standard wireless protocols.',E,E,E,E,E,E,E,E,E,'both',E,E,E],
      ['truefalse','physics','A stepper motor uses feedback to know its position.','easy',E,E,E,E,'False','Stepper motors move in fixed open-loop steps.',E,E,E,E,E,E,E,E,E,'student',E,E,E],
      ['label','robotics','What component is shown in the image?','medium','Servo motor','DC motor','Stepper motor','Solenoid','C',E,'https://example.com/component.jpg',E,E,E,E,E,E,E,E,'student',E,E,E],
      ['match','chemistry','Match each component to its function','easy',E,E,E,E,E,E,E,'Sensor','Detects input signals','Motor','Converts electricity to motion','CPU','Processes instructions','Battery','Stores electrical energy','both',E,E,E],
      ['order','mathematics','Arrange the steps to compute a rectangle’s area','easy',E,E,E,E,E,'Start first, End last.',E,E,E,E,E,E,E,E,E,'student','Start|Input length and width|Area = length × width|Print area|End',E,E],
      ['categorize','robotics','Group each device by its role','medium',E,E,E,E,E,E,E,E,E,E,E,E,E,E,E,'student',E,'Input Device: Keyboard, Mouse; Processing Device: CPU, RAM; Output Device: Monitor, Printer',E],
      ['hotspot','robotics','Label the parts of the computer','medium',E,E,E,E,E,E,'https://example.com/computer.jpg',E,E,E,E,E,E,E,E,'student',E,E,'Keyboard@45,80; Mouse@70,82; Monitor@40,25; CPU@80,45'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{wch:11},{wch:20},{wch:46},{wch:10},{wch:26},{wch:20},{wch:20},{wch:20},{wch:9},{wch:42},{wch:34},{wch:16},{wch:22},{wch:16},{wch:22},{wch:16},{wch:22},{wch:16},{wch:22},{wch:15},{wch:46},{wch:54},{wch:46}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'question_bank_template.xlsx');
  };

  const handleImport = async () => {
    setImporting(true);
    let summary = null;
    try {
      summary = await onImport(parsed, catId === '__new__' ? null : catId, catId === '__new__' ? newCatName.trim() || 'Imported' : null);
    } catch { /* ignore — UI advances to done step regardless */ }
    setResult(summary);
    setImporting(false);
    setStep('done');
  };

  const typeLabel = (t) => Q_TYPES.find(q=>q.value===t)?.label || t;

  return (
    <Modal isOpen={isOpen} onClose={()=>{reset();onClose();}} title={`Import Questions — ${levelName}`} size="lg"
      footer={
        step==='preview' ? (
          <div className="flex items-center justify-between w-full">
            <button onClick={()=>setStep('upload')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Back</button>
            <div className="flex gap-3">
              <button onClick={()=>{reset();onClose();}} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleImport} disabled={importing||(catId==='__new__'&&!newCatName.trim())}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {importing?<><Loader2 size={14} className="animate-spin"/>Importing…</>:<><Download size={14}/>Import {parsed.length} Questions</>}
              </button>
            </div>
          </div>
        ) : step==='done' ? (
          <button onClick={()=>{reset();onClose();}} className="px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors">Done</button>
        ) : null
      }>
      {step==='upload' && (
        <div className="space-y-5">
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-sm font-bold text-indigo-800 mb-3">Supported Types &amp; Columns</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {type:'MCQ',          cols:['type=mcq','opt_a–opt_d','correct = A/B/C/D']},
                {type:'True / False', cols:['type=truefalse','correct = True/False']},
                {type:'Label',        cols:['type=label','image_url','opt_a–opt_d + correct']},
                {type:'Match',        cols:['type=match','p1_left/p1_right …','(exactly 4 pairs)']},
                {type:'Order',        cols:['type=order','steps = a | b | c','(in correct order)']},
                {type:'Categorize',   cols:['type=categorize','groups = G1: a, b; G2: c, d']},
                {type:'Hotspot',      cols:['type=hotspot','image_url','hotspots = label@x,y; …']},
              ].map(f=>(
                <div key={f.type} className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 mb-2">{f.type}</p>
                  {f.cols.map(c=><p key={c} className="text-[10px] text-slate-500 font-mono leading-relaxed">• {c}</p>)}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-indigo-700/80 mt-2">All rows also accept <span className="font-mono">category</span> (robotics/chemistry/physics/mathematics — used for filtering; blank inherits the target category), <span className="font-mono">difficulty</span> (easy/medium/hard), <span className="font-mono">explanation</span>, and <span className="font-mono">applicable_for</span> (student/trainer/both).</p>
            <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <Download size={12}/> Download Excel Template (.xlsx)
            </button>
          </div>
          <label onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0]);}}
            className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver?'border-indigo-400 bg-indigo-50':'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
            <FileSpreadsheet size={36} className={`mx-auto mb-3 ${dragOver?'text-indigo-500':'text-slate-300'}`}/>
            <p className="text-sm font-semibold text-slate-600">Drop your Excel or CSV file here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse · .xlsx and .csv accepted</p>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>processFile(e.target.files[0])}/>
          </label>
          {error && <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600"><AlertCircle size={14}/>{error}</div>}
        </div>
      )}
      {step==='preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {[{l:'Total',v:parsed.length,c:'bg-slate-100 text-slate-700'},{l:'MCQ',v:parsed.filter(q=>q.type==='mcq').length,c:'bg-blue-100 text-blue-700'},{l:'Match',v:parsed.filter(q=>q.type==='match').length,c:'bg-violet-100 text-violet-700'},{l:'Label',v:parsed.filter(q=>q.type==='label').length,c:'bg-rose-100 text-rose-700'}].map(s=>(
              <div key={s.l} className={`px-4 py-2 rounded-xl text-center ${s.c}`}><p className="text-lg font-bold">{s.v}</p><p className="text-[10px] font-semibold">{s.l}</p></div>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Import Into Category</label>
            <select value={catId} onChange={e=>setCatId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Create new category</option>
            </select>
            {catId==='__new__' && <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="New category name…" className="mt-2 w-full px-3 py-2.5 rounded-xl border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>}
          </div>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100"><p className="text-xs font-bold text-slate-500">Preview (first 5 of {parsed.length})</p></div>
            <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
              {parsed.slice(0,5).map((q,i)=>(
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{q.text}</p>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">{typeLabel(q.type)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${DIFF_CFG[q.difficulty]?.cls}`}>{DIFF_CFG[q.difficulty]?.label}</span>
                    </div>
                  </div>
                </div>
              ))}
              {parsed.length>5 && <div className="px-4 py-2 text-center text-xs text-slate-400 italic">…and {parsed.length-5} more</div>}
            </div>
          </div>
        </div>
      )}
      {step==='done' && (() => {
        const r = result || { total: parsed.length, imported: parsed.length, duplicates: 0, errors: 0 };
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-500"/></div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Import Complete</h3>
            <p className="text-sm text-slate-500 mb-5">Added to <span className="font-semibold text-slate-700">{levelName}</span></p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="px-4 py-2.5 rounded-xl bg-slate-100 text-center min-w-[84px]">
                <p className="text-xl font-bold text-slate-700">{r.total}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Total</p>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-green-100 text-center min-w-[84px]">
                <p className="text-xl font-bold text-green-700">{r.imported}</p>
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Imported</p>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-amber-100 text-center min-w-[84px]">
                <p className="text-xl font-bold text-amber-700">{r.duplicates}</p>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Duplicates</p>
              </div>
              {r.errors > 0 && (
                <div className="px-4 py-2.5 rounded-xl bg-red-100 text-center min-w-[84px]">
                  <p className="text-xl font-bold text-red-700">{r.errors}</p>
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Failed</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-5">
              {r.duplicates > 0
                ? `${r.duplicates} duplicate${r.duplicates !== 1 ? 's' : ''} already existed and ${r.duplicates !== 1 ? 'were' : 'was'} skipped — ${r.imported} new question${r.imported !== 1 ? 's' : ''} imported.`
                : `All ${r.imported} question${r.imported !== 1 ? 's' : ''} imported successfully.`}
            </p>
          </div>
        );
      })()}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Form Modal
// ═══════════════════════════════════════════════════════════════════════════
function QuestionFormModal({ isOpen, onClose, onSave, initial, levelName, catName, defaultAudience = 'student' }) {
  const initAF = initial?.applicableFor || defaultAudience || 'student';
  const [form, setForm]     = useState(() => initial
    ? { ...initial, options: initial.options?.map(normalizeOpt), pairs: initial.pairs?.map(normalizePair), applicableFor: initAF }
    : blankMcq(defaultAudience));
  const [errors, setErrors] = useState({});

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setOpt  = (i, field, val) => setForm(p => { const opts = (Array.isArray(p.options)?p.options:[]).map(normalizeOpt); opts[i]={...opts[i],[field]:val}; return {...p,options:opts}; });
  const setPair = (i, side, val) => setForm(p => { const pairs=(p.pairs||[]).map(normalizePair); pairs[i]={...pairs[i],[side]:val}; return {...p,pairs}; });

  // ── Ordering step helpers (options ARE the correct order) ──────────────────
  const addStep    = () => setForm(p => ({ ...p, options: [...(p.options||[]), blankOpt()] }));
  const removeStep = (i) => setForm(p => ({ ...p, options: (p.options||[]).filter((_,j)=>j!==i) }));
  const moveStep   = (i, dir) => setForm(p => {
    const arr = [...(p.options||[])]; const j = i + dir;
    if (j < 0 || j >= arr.length) return p;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...p, options: arr };
  });

  // ── Categorize helpers (extras.buckets + extras.items) ─────────────────────
  const ex = form.extras || {};
  const setExtras  = (updater) => setForm(p => ({ ...p, extras: updater(p.extras || {}) }));
  const setBucket  = (i, val) => setExtras(x => ({ ...x, buckets: (x.buckets||[]).map((b,j)=> j===i?val:b) }));
  const addBucket  = () => setExtras(x => ({ ...x, buckets: [...(x.buckets||[]), `Group ${String.fromCharCode(65+(x.buckets||[]).length)}`] }));
  const removeBucket = (i) => setExtras(x => {
    const buckets = (x.buckets||[]).filter((_,j)=>j!==i);
    // Re-point items: items in the removed bucket fall back to bucket 0; items
    // after it shift down by one so indices stay valid.
    const items = (x.items||[]).map(it => {
      const b = Number(it.bucket);
      return { ...it, bucket: b === i ? 0 : b > i ? b - 1 : b };
    });
    return { ...x, buckets, items };
  });
  const setItem      = (i, field, val) => setExtras(x => ({ ...x, items: (x.items||[]).map((it,j)=> j===i?{...it,[field]:val}:it) }));
  const addItem      = () => setExtras(x => ({ ...x, items: [...(x.items||[]), blankCatItem()] }));
  const removeItem   = (i) => setExtras(x => ({ ...x, items: (x.items||[]).filter((_,j)=>j!==i) }));

  // ── Hotspot helpers (extras.hotspots = [{x,y,label}]) ──────────────────────
  const addHotspot    = (x, y) => setExtras(e2 => ({ ...e2, hotspots: [...(e2.hotspots||[]), { x: Math.round(x), y: Math.round(y), label: '' }] }));
  const setHotspot    = (i, field, val) => setExtras(e2 => ({ ...e2, hotspots: (e2.hotspots||[]).map((h,j)=> j===i?{...h,[field]:val}:h) }));
  const removeHotspot = (i) => setExtras(e2 => ({ ...e2, hotspots: (e2.hotspots||[]).filter((_,j)=>j!==i) }));

  const handleTypeChange = (t) => { setForm(p => ({ ...blankForType(t, p.applicableFor || defaultAudience), id: p.id, difficulty: p.difficulty, text: p.text, imageUrl: p.imageUrl || '' })); setErrors({}); };

  const validate = () => {
    const e = {};
    const needsImg = form.type === 'hotspot';
    if (!form.text.trim() && !form.imageUrl && !needsImg) e.text = 'Question text or image required';
    if (form.type === 'match') {
      (form.pairs || []).forEach((p, i) => { const pr=normalizePair(p); if ((!pr.left.trim()&&!pr.leftImage)||(!pr.right.trim()&&!pr.rightImage)) e[`pair${i}`]='Both sides need text or image'; });
    } else if (form.type === 'truefalse') {
      if (form.correct === null || form.correct === undefined) e.correct = 'Please select True or False';
    } else if (form.type === 'order') {
      const opts = form.options || [];
      if (opts.length < 2) e.order = 'Add at least 2 steps';
      opts.forEach((o,i)=>{ const opt=normalizeOpt(o); if(!opt.text.trim()&&!opt.imageUrl) e[`opt${i}`]='Fill every step'; });
    } else if (form.type === 'categorize') {
      const buckets = ex.buckets || []; const items = ex.items || [];
      if (buckets.filter(b=>b.trim()).length < 2) e.buckets = 'Add at least 2 named groups';
      if (items.length < 2) e.items = 'Add at least 2 items';
      items.forEach((it,i)=>{ if(!it.text?.trim() && !it.imageUrl) e[`item${i}`]='Fill every item'; if(it.bucket===undefined||it.bucket===null||Number(it.bucket)>=buckets.length) e[`item${i}`]='Pick a group'; });
    } else if (form.type === 'hotspot') {
      if (!form.imageUrl) e.text = 'A base image is required for hotspot questions';
      const hs = ex.hotspots || [];
      if (hs.length < 2) e.hotspots = 'Add at least 2 hotspots (click the image)';
      hs.forEach((h,i)=>{ if(!h.label?.trim()) e[`hs${i}`]='Each hotspot needs a label'; });
    } else {
      (form.options||[]).forEach((o,i)=>{ const opt=normalizeOpt(o); if(!opt.text.trim()&&!opt.imageUrl) e[`opt${i}`]='Fill all options'; });
      if (form.correct === null || form.correct === undefined) e.correct = 'Please select the correct answer';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => { if (!validate()) return; onSave({ ...form, id: form.id || uid('q'), text: form.text.trim() }); };

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all';
  const lbl = 'text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form.id ? 'Edit Question' : 'Add New Question'} size="lg"
      footer={<div className="flex gap-3 justify-end w-full">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
          <Save size={14}/>{form.id ? 'Save Changes' : 'Add Question'}
        </button>
      </div>}>
      <div className="space-y-5">
        {(levelName || catName) && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            <Layers size={12}/>{levelName && <span className="font-semibold text-slate-600">{levelName}</span>}
            {levelName && catName && <ChevronRight size={10}/>}
            {catName && <span className="font-semibold text-slate-600">{catName}</span>}
          </div>
        )}
        <div>
          <label className={lbl}>Question Type</label>
          <div className="grid grid-cols-2 gap-2">
            {Q_TYPES.map(qt => { const Icon=qt.icon; return (
              <button key={qt.value} type="button" onClick={() => handleTypeChange(qt.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${form.type===qt.value?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <Icon size={16} className={`mb-1.5 ${form.type===qt.value?'text-indigo-600':'text-slate-400'}`}/>
                <p className={`text-xs font-bold ${form.type===qt.value?'text-indigo-700':'text-slate-700'}`}>{qt.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{qt.sub}</p>
              </button>
            );})}
          </div>
        </div>
        <div className="space-y-2">
          <label className={lbl}>Question Text <span className="text-slate-400 normal-case font-normal">(or image only)</span></label>
          <textarea rows={3} value={form.text} onChange={e => set('text', e.target.value)} placeholder="Type your question here…"
            className={`${inp} resize-none ${errors.text ? 'border-red-400' : ''}`}/>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-1"><Image size={11}/> Question Image <span className="font-normal">(optional)</span></div>
          <input type="url" value={form.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)}
            placeholder="Paste image URL here…"
            className={`${inp} text-sm`}/>
          <p className="text-[10px] text-slate-400 text-center font-semibold">— or upload a file —</p>
          <ImageUpload value={form.imageUrl || ''} onChange={v => set('imageUrl', v)} />
          {errors.text && <p className="text-xs text-red-500">{errors.text}</p>}
        </div>
        {(form.type==='mcq'||form.type==='label') && (
          <div>
            <label className={lbl}>Answer Options <span className="text-red-400">*</span><span className="normal-case font-normal text-slate-400 ml-1">Click letter to mark correct</span></label>
            <div className="space-y-2">
              {(form.options||[]).map((opt,i)=>{ const optObj=normalizeOpt(opt); const correct=form.correct===i; return (
                <div key={i} className={`rounded-xl border-2 p-3 transition-all ${correct?'border-green-300 bg-green-50':errors[`opt${i}`]?'border-red-300':'border-slate-100 bg-slate-50/60'}`}>
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={()=>set('correct',i)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all ${correct?'bg-green-500 border-green-500 text-white':'border-slate-300 text-slate-400 hover:border-green-400'}`}>
                      {String.fromCharCode(65+i)}
                    </button>
                    <input value={optObj.text} onChange={e=>setOpt(i,'text',e.target.value)} placeholder={`Option ${String.fromCharCode(65+i)}…`}
                      className={`flex-1 bg-transparent outline-none text-sm placeholder-slate-300 ${correct?'text-green-800 font-semibold':'text-slate-700'}`}/>
                    {correct && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 shrink-0"><Check size={10}/>Correct</span>}
                  </div>
                  {errors[`opt${i}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`opt${i}`]}</p>}
                </div>
              );})}
            </div>
            {errors.correct && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.correct}</p>}
          </div>
        )}
        {form.type==='truefalse' && (
          <div>
            <label className={lbl}>Correct Answer <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[{label:'True',idx:0,color:'emerald'},{label:'False',idx:1,color:'rose'}].map(({label,idx,color})=>{
                const selected=form.correct===idx;
                return (
                  <button key={label} type="button" onClick={()=>set('correct',idx)}
                    className={`py-6 rounded-2xl border-2 font-bold text-lg transition-all ${selected?(color==='emerald'?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-rose-500 bg-rose-50 text-rose-700'):(errors.correct?'border-red-300 text-slate-500':'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50')}`}>
                    {selected && <Check size={16} className="mx-auto mb-1"/>}
                    {label}
                    {selected && <p className="text-[10px] font-semibold mt-1 opacity-70">Correct Answer</p>}
                  </button>
                );
              })}
            </div>
            {errors.correct && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.correct}</p>}
          </div>
        )}
        {form.type==='match' && (
          <div>
            <label className={lbl}>Match Pairs <span className="text-red-400">*</span></label>
            <div className="space-y-3">
              {(form.pairs||[]).map((pair,i)=>{ const pr=normalizePair(pair); return (
                <div key={i} className={`bg-slate-50 rounded-xl p-3 border-2 ${errors[`pair${i}`]?'border-red-300':'border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{i+1}.</span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Pair {i+1}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Left Side</p>
                      <input value={pr.left} onChange={e=>setPair(i,'left',e.target.value)} placeholder="Text…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                      <ImageUpload value={pr.leftImage} onChange={v=>setPair(i,'leftImage',v)} compact/>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Right Side</p>
                      <input value={pr.right} onChange={e=>setPair(i,'right',e.target.value)} placeholder="Text…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                      <ImageUpload value={pr.rightImage} onChange={v=>setPair(i,'rightImage',v)} compact/>
                    </div>
                  </div>
                  {errors[`pair${i}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`pair${i}`]}</p>}
                </div>
              );})}
            </div>
          </div>
        )}

        {/* ── Ordering editor ─────────────────────────────────────────── */}
        {form.type==='order' && (
          <div>
            <label className={lbl}>Steps in Correct Order <span className="text-red-400">*</span>
              <span className="normal-case font-normal text-slate-400 ml-1">Students see them shuffled</span></label>
            <div className="space-y-2">
              {(form.options||[]).map((opt,i)=>{ const optObj=normalizeOpt(opt); return (
                <div key={i} className={`rounded-xl border-2 p-3 ${errors[`opt${i}`]?'border-red-300':'border-slate-100 bg-slate-50/60'}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</span>
                    <input value={optObj.text} onChange={e=>setOpt(i,'text',e.target.value)} placeholder={`Step ${i+1}…`}
                      className="flex-1 bg-transparent outline-none text-sm placeholder-slate-300 text-slate-700"/>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={()=>moveStep(i,-1)} disabled={i===0}
                        className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowUp size={12}/></button>
                      <button type="button" onClick={()=>moveStep(i,1)} disabled={i===(form.options||[]).length-1}
                        className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ArrowDown size={12}/></button>
                      {(form.options||[]).length>2 && (
                        <button type="button" onClick={()=>removeStep(i)}
                          className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-red-400 hover:bg-red-50"><X size={12}/></button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pl-9"><ImageUpload value={optObj.imageUrl} onChange={v=>setOpt(i,'imageUrl',v)} compact/></div>
                </div>
              );})}
            </div>
            <button type="button" onClick={addStep} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"><Plus size={13}/> Add step</button>
            {errors.order && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.order}</p>}
          </div>
        )}

        {/* ── Categorize editor ───────────────────────────────────────── */}
        {form.type==='categorize' && (
          <div className="space-y-4">
            <div>
              <label className={lbl}>Groups / Categories <span className="text-red-400">*</span></label>
              <div className="space-y-2">
                {(ex.buckets||[]).map((b,i)=>(
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-5">{i+1}.</span>
                    <input value={b} onChange={e=>setBucket(i,e.target.value)} placeholder={`Group ${i+1} name…`}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                    {(ex.buckets||[]).length>2 && (
                      <button type="button" onClick={()=>removeBucket(i)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-red-400 hover:bg-red-50"><X size={13}/></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBucket} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"><Plus size={13}/> Add group</button>
              {errors.buckets && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.buckets}</p>}
            </div>
            <div>
              <label className={lbl}>Items <span className="text-red-400">*</span>
                <span className="normal-case font-normal text-slate-400 ml-1">Pick the correct group for each</span></label>
              <div className="space-y-2">
                {(ex.items||[]).map((it,i)=>(
                  <div key={i} className={`rounded-xl border-2 p-3 ${errors[`item${i}`]?'border-red-300':'border-slate-100 bg-slate-50/60'}`}>
                    <div className="flex items-center gap-2">
                      <input value={it.text||''} onChange={e=>setItem(i,'text',e.target.value)} placeholder={`Item ${i+1}…`}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                      <select value={it.bucket ?? 0} onChange={e=>setItem(i,'bucket',Number(e.target.value))}
                        className="px-2 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[40%]">
                        {(ex.buckets||[]).map((b,bi)=>(<option key={bi} value={bi}>{b||`Group ${bi+1}`}</option>))}
                      </select>
                      {(ex.items||[]).length>2 && (
                        <button type="button" onClick={()=>removeItem(i)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-red-400 hover:bg-red-50 shrink-0"><X size={13}/></button>
                      )}
                    </div>
                    <div className="mt-2"><ImageUpload value={it.imageUrl||''} onChange={v=>setItem(i,'imageUrl',v)} compact/></div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"><Plus size={13}/> Add item</button>
              {errors.items && <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.items}</p>}
            </div>
          </div>
        )}

        {/* ── Hotspot editor ──────────────────────────────────────────── */}
        {form.type==='hotspot' && (
          <div>
            <label className={lbl}>Hotspots <span className="text-red-400">*</span>
              <span className="normal-case font-normal text-slate-400 ml-1">Click the image to add a labelled spot</span></label>
            {form.imageUrl ? (
              <div className="relative w-full rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 cursor-crosshair"
                onClick={e=>{
                  const r = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - r.left) / r.width) * 100;
                  const y = ((e.clientY - r.top) / r.height) * 100;
                  addHotspot(x, y);
                }}>
                <img src={form.imageUrl} alt="Base" className="w-full max-h-[340px] object-contain pointer-events-none"/>
                {(ex.hotspots||[]).map((h,i)=>(
                  <span key={i} style={{ left:`${h.x}%`, top:`${h.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-lg ring-2 ring-white">{i+1}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200">
                Add a <span className="font-semibold">Question Image</span> above first, then click it here to place hotspots.
              </p>
            )}
            {(ex.hotspots||[]).length>0 && (
              <div className="space-y-2 mt-3">
                {(ex.hotspots||[]).map((h,i)=>(
                  <div key={i} className={`flex items-center gap-2 rounded-xl border-2 p-2 ${errors[`hs${i}`]?'border-red-300':'border-slate-100 bg-slate-50/60'}`}>
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                    <input value={h.label||''} onChange={e=>setHotspot(i,'label',e.target.value)} placeholder={`Correct label for spot ${i+1}…`}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                    <button type="button" onClick={()=>removeHotspot(i)} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-red-400 hover:bg-red-50 shrink-0"><X size={13}/></button>
                  </div>
                ))}
              </div>
            )}
            {errors.hotspots && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.hotspots}</p>}
          </div>
        )}

        <div>
          <label className={lbl}>Difficulty</label>
          <div className="flex gap-2">
            {Object.entries(DIFF_CFG).map(([k,v])=>(
              <button key={k} type="button" onClick={()=>set('difficulty',k)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.difficulty===k?v.cls+' border-transparent':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={lbl}>Applicable For <span className="text-red-400">*</span></label>
          <div className="flex gap-2">
            {Object.entries(AF_CFG).map(([k, v]) => {
              const AfIcon = v.icon;
              const active = (form.applicableFor || 'student') === k;
              return (
                <button key={k} type="button" onClick={() => set('applicableFor', k)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    active ? `${v.badge} ${v.border}` : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  <AfIcon size={12}/>{v.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={lbl}>Explanation <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <textarea rows={2} value={form.explanation||''} onChange={e=>set('explanation',e.target.value)} placeholder="Explain why this is the correct answer…"
            className={`${inp} resize-none`}/>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Row
// ═══════════════════════════════════════════════════════════════════════════
function QuestionRow({ q, index, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = Q_TYPES.find(t=>t.value===q.type)||Q_TYPES[0];
  const TypeIcon = typeConf.icon;
  const diff = DIFF_CFG[q.difficulty] || DIFF_CFG.easy;
  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{index}</span>
        <button onClick={()=>setExpanded(p=>!p)} className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{q.text || '[Image question]'}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <TypeIcon size={11} className="text-slate-400"/>
            <span className="text-[10px] text-slate-400">{typeConf.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${diff.cls}`}>{diff.label}</span>
            {(() => { const af=q.applicableFor||'student'; const cfg=AF_CFG[af]||AF_CFG.student; const AfIcon=cfg.icon; return (
              <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                <AfIcon size={9}/>{cfg.label}
              </span>
            ); })()}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
          <button onClick={()=>setExpanded(p=>!p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">{expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-50">
          {q.imageUrl && <img src={q.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-xl border border-slate-100 mt-2"/>}
          {q.type==='match'?(
            <div className="space-y-1.5">
              {(q.pairs||[]).map((p,i)=>{ const pr=normalizePair(p); return (
                <div key={i} className="flex items-stretch gap-2 text-xs">
                  <div className="flex-1 bg-slate-50 rounded-lg p-2 text-slate-700 font-medium">{pr.leftImage&&<img src={pr.leftImage} alt="" className="w-full h-10 object-cover rounded-lg mb-1"/>}{pr.left||<span className="text-slate-400">—</span>}</div>
                  <span className="text-slate-400 font-bold self-center shrink-0">→</span>
                  <div className="flex-1 bg-green-50 rounded-lg p-2 text-green-700 font-medium">{pr.rightImage&&<img src={pr.rightImage} alt="" className="w-full h-10 object-cover rounded-lg mb-1"/>}{pr.right||<span className="text-green-400">—</span>}</div>
                </div>
              );})}
            </div>
          ):q.type==='truefalse'?(
            <div className="flex gap-2">
              {[{label:'True',idx:0},{label:'False',idx:1}].map(({label,idx})=>(
                <div key={label} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs border font-semibold ${idx===q.correct?'bg-green-50 border-green-200 text-green-800':'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  {idx===q.correct&&<CheckCircle size={10} className="text-green-500"/>}{label}
                </div>
              ))}
            </div>
          ):q.type==='order'?(
            <ol className="space-y-1.5">
              {(q.options||[]).map((opt,i)=>{ const o=normalizeOpt(opt); return (
                <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border bg-slate-50 border-slate-100 text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                  {o.imageUrl&&<img src={o.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"/>}
                  <span className="truncate">{o.text||(o.imageUrl?'[Image]':'—')}</span>
                </li>
              );})}
            </ol>
          ):q.type==='categorize'?(
            <div className="space-y-1.5">
              {(q.extras?.buckets||[]).map((b,bi)=>(
                <div key={bi} className="flex items-start gap-2 text-xs">
                  <span className="font-bold text-slate-600 shrink-0 min-w-[80px]">{b}:</span>
                  <span className="text-slate-600">{(q.extras?.items||[]).filter(it=>Number(it.bucket)===bi).map(it=>it.text||'[img]').join(', ')||'—'}</span>
                </div>
              ))}
            </div>
          ):q.type==='hotspot'?(
            <div className="space-y-1.5">
              {(q.extras?.hotspots||[]).map((h,i)=>(
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs border bg-slate-50 border-slate-100 text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                  <span className="truncate">{h.label||'—'}</span>
                </div>
              ))}
            </div>
          ):(
            <div className="space-y-1.5">
              {(q.options||[]).map((opt,i)=>{ const o=normalizeOpt(opt); return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${i===q.correct?'bg-green-50 border-green-200 text-green-800 font-semibold':'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i===q.correct?'bg-green-500 text-white':'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65+i)}</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {o.imageUrl&&<img src={o.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"/>}
                    <span className="truncate">{o.text||(o.imageUrl?'[Image]':'—')}</span>
                  </div>
                  {i===q.correct&&<CheckCircle size={10} className="ml-auto text-green-500 shrink-0"/>}
                </div>
              );})}
            </div>
          )}
          {q.explanation && <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700"><span className="font-bold">Explanation: </span>{q.explanation}</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Category Section — loads questions from API by cat.id
// ═══════════════════════════════════════════════════════════════════════════
function CategorySection({ cat, levelId, levelName, pal, onRenamed, onDeleted, showToast }) {
  const [questions,  setQuestions]  = useState([]);
  const [, setLoaded]               = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [qModal,     setQModal]     = useState(null);
  const [deleteQ,    setDeleteQ]    = useState(null);
  const [renaming,   setRenaming]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getQuestionsByCategory(cat.id)
      .then(qs => { setQuestions(Array.isArray(qs) ? qs : []); setLoaded(true); })
      .catch(err => console.error('Load questions failed:', err.message))
      .finally(() => setLoading(false));
  }, [cat.id]);

  const handleAdd = async (q) => {
    try {
      const saved = await api.addQuestion({
        text:          q.text,
        type:          q.type,
        // Ordering keeps full option objects so step images survive; other types
        // flatten to plain strings as before.
        options:       q.type === 'order' ? (q.options || []).map(normalizeOpt) : flattenOptions(q.options),
        pairs:         flattenPairs(q.pairs),
        extras:        q.extras || {},
        correctAnswer: q.correct ?? 0,
        difficulty:    q.difficulty,
        imageUrl:      q.imageUrl || '',
        explanation:   q.explanation || '',
        applicableFor: q.applicableFor || 'student',
        qbCategoryId:  cat.id,
        qbLevelId:     levelId,
        levelId:       undefined,
        category:      getCatFromName(cat.name),
        bankName:      'Question Bank',
        status:        'active',
      });
      setQuestions(prev => [...prev, saved?.id ? { ...q, id: saved.id } : q]);
      setQModal(null);
      showToast?.('Question added!');
    } catch (err) { showToast?.(`Failed to add: ${err.message}`, 'red'); }
  };

  const handleEdit = async (updated) => {
    const original = questions.find(q => q.id === updated.id);
    setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
    setQModal(null);
    try {
      await api.updateQuestion(updated.id, {
        text: updated.text, type: updated.type,
        options: updated.type === 'order' ? (updated.options || []).map(normalizeOpt) : flattenOptions(updated.options),
        pairs: flattenPairs(updated.pairs),
        extras: updated.extras || {},
        correctAnswer: updated.correct ?? 0, difficulty: updated.difficulty,
        imageUrl: updated.imageUrl || '', explanation: updated.explanation || '',
        applicableFor: updated.applicableFor || 'student',
      });
      showToast?.('Question updated!');
    } catch (err) {
      if (original) setQuestions(prev => prev.map(q => q.id === updated.id ? original : q));
      showToast?.(`Failed to update: ${err.message}`, 'red');
    }
  };

  const handleDeleteQ = async () => {
    const toDelete = deleteQ;
    const original = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== toDelete.id));
    setDeleteQ(null);
    try {
      await api.deleteQuestion(toDelete.id);
      showToast?.('Question deleted.');
    } catch (err) {
      setQuestions(original);
      showToast?.(`Failed to delete: ${err.message}`, 'red');
    }
  };

  const handleRename = async (name) => {
    try {
      await api.updateQbCategory(cat.id, { name });
      onRenamed?.(cat.id, name);
      setRenaming(false);
    } catch (err) { showToast?.(`Failed to rename: ${err.message}`, 'red'); }
  };

  const handleDeleteCat = async () => {
    setConfirmDel(false);
    try {
      await api.deleteQbCategory(cat.id);
      onDeleted?.(cat.id);
      showToast?.(`"${cat.name}" deleted.`);
    } catch (err) { showToast?.(`Failed to delete: ${err.message}`, 'red'); }
  };

  const qCount = questions.length;
  const visibleQuestions = questions;
  const visCount = qCount;

  return (
    <div className={`rounded-2xl border-2 ${pal.border} overflow-hidden`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${pal.light}`}>
        <button onClick={()=>setCollapsed(p=>!p)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {collapsed?<Folder size={16} className={pal.text}/>:<FolderOpen size={16} className={pal.text}/>}
          {renaming?(
            <div className="flex-1" onClick={e=>e.stopPropagation()}>
              <InlineInput initial={cat.name} placeholder="Category name" onSave={handleRename} onCancel={()=>setRenaming(false)}/>
            </div>
          ):(
            <>
              <span className={`text-sm font-bold ${pal.text} truncate`}>{cat.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 ${pal.text} shrink-0`}>{qCount} {qCount===1?'question':'questions'}</span>
            </>
          )}
        </button>
        {!renaming && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={()=>setQModal('add')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border ${pal.border} ${pal.text} text-xs font-bold hover:opacity-80 transition-all shadow-sm`}>
              <Plus size={12}/>Add Question
            </button>
            <button onClick={()=>setRenaming(true)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors"><Edit2 size={13}/></button>
            <button onClick={()=>setConfirmDel(true)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
            <button onClick={()=>setCollapsed(p=>!p)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors">{collapsed?<ChevronDown size={13}/>:<ChevronUp size={13}/>}</button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
          ) : visCount === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <HelpCircle size={28} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-sm font-semibold text-slate-400">No questions yet</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">Add MCQ, Match, Label, or True/False questions</p>
              <button onClick={()=>setQModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                <Plus size={12}/>Add First Question
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleQuestions.map((q,i)=>(
                <QuestionRow key={q.id} q={q} index={i+1} onEdit={()=>setQModal(q)} onDelete={()=>setDeleteQ(q)}/>
              ))}
              <button onClick={()=>setQModal('add')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all">
                <Plus size={13}/>Add Another Question
              </button>
            </div>
          )}
        </div>
      )}

      {qModal !== null && (
        <QuestionFormModal isOpen onClose={()=>setQModal(null)}
          onSave={qModal==='add' ? handleAdd : handleEdit}
          initial={qModal==='add' ? null : qModal}
          levelName={levelName} catName={cat.name}
          defaultAudience="student"/>
      )}
      <DeleteModal isOpen={!!deleteQ} onClose={()=>setDeleteQ(null)} onConfirm={handleDeleteQ}
        title="Delete Question?" message={`"${deleteQ?.text||'This question'}" will be permanently removed.`}/>
      <DeleteModal isOpen={confirmDel} onClose={()=>setConfirmDel(false)} onConfirm={handleDeleteCat}
        title={`Delete "${cat.name}"?`} message={`All ${qCount} questions in this category will be permanently deleted.`}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Level Section — loads categories from API, manages them via CRUD
// ═══════════════════════════════════════════════════════════════════════════
function LevelSection({ level, bankId, index, onRenamed, showToast }) {
  const pal = levelPal(index);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [collapsed,   setCollapsed]   = useState(false);
  const [addingCat,   setAddingCat]   = useState(false);
  const [renaming,    setRenaming]    = useState(false);
  const [importOpen,  setImportOpen]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    api.getQbCategories(level.id)
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(err => console.error('Load categories failed:', err.message))
      .finally(() => setLoading(false));
  }, [level.id]);

  const handleAddCategory = async (name) => {
    setSaving(true);
    try {
      const newCat = await api.createQbCategory({ levelId: level.id, bankId, name });
      setCategories(prev => [...prev, newCat]);
      setAddingCat(false);
      showToast?.('Category added!');
    } catch (err) {
      showToast?.(`Failed to add category: ${err.message}`, 'red');
    } finally { setSaving(false); }
  };

  const handleRenameLevel = async (name) => {
    try {
      await api.updateQbLevel(level.id, { name });
      onRenamed?.(level.id, name);
      setRenaming(false);
    } catch (err) { showToast?.(`Failed to rename: ${err.message}`, 'red'); }
  };

  const handleImport = async (questions, catId, newCatName) => {
    let targetCatId = catId;

    if (!catId && newCatName) {
      try {
        const newCat = await api.createQbCategory({ levelId: level.id, bankId, name: newCatName });
        targetCatId = newCat.id;
        setCategories(prev => [...prev, newCat]);
      } catch (err) {
        showToast?.(`Failed to create category: ${err.message}`, 'red');
        return;
      }
    }

    const total = questions.length;
    const norm  = (t = '') => t.trim().toLowerCase();

    // Skip questions that already exist in the target category (by text). Fetch
    // the current questions for that category; if the lookup fails, fall back to
    // batch-only dedup rather than blocking the import.
    const existing = new Set();
    if (targetCatId) {
      try {
        const current = await api.getQuestionsByCategory(targetCatId);
        (Array.isArray(current) ? current : []).forEach(q => existing.add(norm(q.text)));
      } catch { /* couldn't load existing — proceed with batch dedup only */ }
    }

    // Deduplicate within the imported batch AND against existing questions.
    const seen = new Set();
    let duplicates = 0;
    const toImport = questions.filter(q => {
      const key = norm(q.text);
      if (seen.has(key) || existing.has(key)) { duplicates++; return false; }
      seen.add(key);
      return true;
    });

    const targetCatName = categories.find(c => c.id == targetCatId)?.name || newCatName || '';
    let imported = 0;
    let errors   = 0;
    for (const q of toImport) {
      try {
        await api.addQuestion({
          text: q.text, type: q.type,
          options: q.type === 'order' ? (q.options || []).map(normalizeOpt) : flattenOptions(q.options),
          pairs: flattenPairs(q.pairs),
          extras: q.extras || {},
          correctAnswer: q.correct ?? 0, difficulty: q.difficulty,
          imageUrl: q.imageUrl || '', explanation: q.explanation || '',
          applicableFor: q.applicableFor || 'student',
          qbCategoryId: targetCatId, qbLevelId: level.id,
          levelId: undefined,
          // Per-row category (subject) when provided; otherwise inherit the target category.
          category: q.category ? getCatFromName(q.category) : getCatFromName(targetCatName),
          bankName: 'Question Bank', status: 'active',
        });
        imported++;
      } catch { errors++; }
    }

    const parts = [`${imported} imported`];
    if (duplicates > 0) parts.push(`${duplicates} duplicate${duplicates !== 1 ? 's' : ''} skipped`);
    if (errors > 0)     parts.push(`${errors} failed`);
    showToast?.(`${total} total · ${parts.join(' · ')}.`);

    // Return the summary so the modal can show a post-import breakdown.
    return { total, imported, duplicates, errors };
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <div className={`bg-gradient-to-r ${pal.bg} px-5 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Layers size={16} className="text-white"/></div>
          <div className="flex-1 min-w-0">
            {renaming ? (
              <div onClick={e=>e.stopPropagation()}>
                <InlineInput initial={level.name} placeholder="Level name" onSave={handleRenameLevel} onCancel={()=>setRenaming(false)}/>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-base" style={{fontFamily:'Space Grotesk'}}>{level.name}</h3>
                <span className="text-white/70 text-xs font-semibold">
                  {loading ? '…' : `${categories.length} ${categories.length===1?'category':'categories'}`}
                </span>
              </div>
            )}
          </div>
          {!renaming && (
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <button onClick={()=>setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30">
                <Download size={12}/>Import Excel
              </button>
              <button onClick={()=>setAddingCat(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all">
                <Plus size={13}/>Add Category
              </button>
              <button onClick={()=>setRenaming(true)} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-all"><Edit2 size={13}/></button>
              <button onClick={()=>setCollapsed(p=>!p)} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all">{collapsed?<ChevronDown size={15}/>:<ChevronUp size={15}/>}</button>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className={`${pal.light} px-5 py-4 space-y-3`}>
          {addingCat && (
            <div className={`bg-white rounded-2xl border-2 ${pal.border} p-4`}>
              <p className={`text-xs font-bold ${pal.text} mb-2`}>New Category Name</p>
              {saving ? (
                <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin"/>Creating…</div>
              ) : (
                <InlineInput placeholder="e.g. Basics, Advanced Concepts…" onSave={handleAddCategory} onCancel={()=>setAddingCat(false)}/>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
          ) : categories.length === 0 && !addingCat ? (
            <div className="text-center py-10 bg-white/70 rounded-2xl border-2 border-dashed border-white">
              <Tag size={28} className={`${pal.text} mx-auto mb-2 opacity-40`}/>
              <p className={`text-sm font-semibold ${pal.text} opacity-60`}>No categories yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">Create categories to organise your questions</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={()=>setAddingCat(true)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${pal.bg}`}><Plus size={12}/>Add Category</button>
                <button onClick={()=>setImportOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50"><Download size={12}/>Import Excel</button>
              </div>
            </div>
          ) : (
            categories.map(cat => (
              <CategorySection
                key={cat.id} cat={cat}
                levelId={level.id} levelName={level.name} bankId={bankId}
                pal={pal}
                onRenamed={(catId, name) => setCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c))}
                onDeleted={(catId) => setCategories(prev => prev.filter(c => c.id !== catId))}
                showToast={showToast}
              />
            ))
          )}

          {categories.length > 0 && !addingCat && (
            <button onClick={()=>setAddingCat(true)} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-white text-xs font-semibold ${pal.text} opacity-70 hover:opacity-100 hover:bg-white/50 transition-all`}>
              <Plus size={13}/>Add Category
            </button>
          )}
        </div>
      )}

      {importOpen && (
        <ImportModal isOpen levelName={level.name} categories={categories}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}/>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bank Detail — loads levels for this bank
// ═══════════════════════════════════════════════════════════════════════════
function BankDetail({ bank, bankIndex, onBankRenamed, showToast }) {
  const [levels,       setLevels]      = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [addingLevel,  setAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName]= useState('');
  const [renamingBank, setRenamingBank]= useState(false);
  const [saving,       setSaving]      = useState(false);

  useEffect(() => {
    api.getQbLevels(bank.id)
      .then(lvls => setLevels(Array.isArray(lvls) ? lvls : []))
      .catch(err => console.error('Load levels failed:', err.message))
      .finally(() => setLoading(false));
  }, [bank.id]);

  const handleAddLevel = async () => {
    const name = newLevelName.trim() || `Level ${levels.length + 1}`;
    setSaving(true);
    try {
      const newLevel = await api.createQbLevel({ bankId: bank.id, name });
      setLevels(prev => [...prev, newLevel]);
      setNewLevelName('');
      setAddingLevel(false);
      showToast?.('Level added!');
    } catch (err) {
      showToast?.(`Failed: ${err.message}`, 'red');
    } finally { setSaving(false); }
  };

  const handleRenameBank = async (name) => {
    try {
      await api.updateQuestionBank(bank.id, { name });
      onBankRenamed?.(bank.id, name);
      setRenamingBank(false);
    } catch (err) { showToast?.(`Failed: ${err.message}`, 'red'); }
  };

  const pal2 = bankPal(bankIndex);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          {renamingBank ? (
            <div className="max-w-xs">
              <InlineInput initial={bank.name} placeholder="Bank name" onSave={handleRenameBank} onCancel={()=>setRenamingBank(false)}/>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${pal2.grad}`}><Database size={14} className="text-white"/></div>
              <h1 className="text-2xl font-bold text-slate-800" style={{fontFamily:'Space Grotesk'}}>{bank.name}</h1>
              <button onClick={()=>setRenamingBank(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Edit2 size={14}/></button>
            </div>
          )}
          <p className="text-sm text-slate-400 mt-1 ml-10">
            <span className="font-semibold text-slate-600">{levels.length}</span> levels
          </p>
        </div>
        <button onClick={()=>setAddingLevel(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-all bg-gradient-to-r ${pal2.grad}`}>
          <Plus size={16}/>Add Level
        </button>
      </div>

      {addingLevel && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2"><Layers size={15}/>New Level</p>
          {saving ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin"/>Creating…</div>
          ) : (
            <div className="space-y-3">
              <input autoFocus value={newLevelName} onChange={e=>setNewLevelName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleAddLevel(); if(e.key==='Escape'){setAddingLevel(false);setNewLevelName('');} }}
                placeholder={`e.g. Level ${levels.length + 1}, Advanced…`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
              <div className="flex items-center gap-2">
                <button onClick={handleAddLevel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:opacity-90 transition-all">
                  <Plus size={12}/>Add Level
                </button>
                <button onClick={()=>{setAddingLevel(false);setNewLevelName('');}} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-300"/></div>
      ) : levels.length === 0 && !addingLevel ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Layers size={36} className="text-slate-300 mx-auto mb-3"/>
          <p className="font-semibold text-slate-400">No levels yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Add a level to start organising your questions</p>
          <button onClick={()=>setAddingLevel(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
            <Plus size={15}/>Add Level
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {levels.map((level, idx) => (
            <LevelSection key={level.id} level={level} bankId={bank.id} index={idx}
              onRenamed={(levelId, name) => setLevels(prev => prev.map(l => l.id === levelId ? { ...l, name } : l))}
              showToast={showToast}/>
          ))}
          {!addingLevel && (
            <button onClick={()=>setAddingLevel(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all">
              <Plus size={15}/>Add Another Level
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Banks Overview
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════
export default function QuestionBankAdmin() {
  // The whole app uses exactly ONE Question Bank, so there's no list/selection
  // screen — clicking "Question Bank" in the nav opens this single bank's detail
  // page directly. We load the first (canonical) bank, auto-creating one if none
  // exists yet, and render its contents straight away.
  const [bank,    setBank]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); }, []);

  useEffect(() => {
    let cancelled = false;
    api.getQuestionBanks()
      .then(async (data) => {
        const list = Array.isArray(data) ? data : [];
        const b = list[0] || await api.createQuestionBank({ name: 'Question Bank' });
        if (!cancelled) { setBank(b); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setError(err?.message || 'Failed to load the Question Bank.'); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const handleRenameBank = useCallback(async (id, name) => {
    await api.updateQuestionBank(id, { name });
    setBank(prev => (prev && prev.id === id ? { ...prev, name } : prev));
  }, []);

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-400"/>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">
      {toast && <Toast msg={toast}/>}

      {bank ? (
        <BankDetail
          bank={bank}
          bankIndex={0}
          onBankRenamed={handleRenameBank}
          showToast={showToast}/>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Database size={36} className="text-slate-300 mx-auto mb-3"/>
          <p className="font-semibold text-slate-500">Couldn't load the Question Bank</p>
          <p className="text-sm text-slate-400 mt-1">{error || 'Please try again in a moment.'}</p>
        </div>
      )}
    </div>
  );
}
