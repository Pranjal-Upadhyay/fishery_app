'use client';

import { useState, useEffect } from 'react';
import {
  Settings2,
  Save,
  Sliders,
  Users,
  ScrollText,
  AlertTriangle,
  Globe,
  BellRing,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { admin } = useAuth();
  const [activeImportType, setActiveImportType] = useState<'hatcheries' | 'ponds' | 'water_logs'>('hatcheries');
  const [file, setFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const downloadCSVTemplate = (type: 'hatcheries' | 'ponds' | 'water_logs') => {
    let headers = '';
    let sampleRow = '';
    let filename = '';

    if (type === 'hatcheries') {
      headers = 'hatchery_name,owner_name,owner_mobile,district,block,panchayat,capacity_kg,area_acres,year_completed,social_category,gender,age,annual_income,disease_occurrence,pond_insured,latitude,longitude';
      sampleRow = 'Ilyash Hatchery,Ilyash,8809490575,Banka,Bounsi,Bhurkuriya,800,5,2014,GENERAL,MALE,42,150000,NONE,FALSE,24.801200,87.021300';
      filename = 'hatcheries_import_template.csv';
    } else if (type === 'ponds') {
      headers = 'farmer_name,farmer_mobile,pond_name,area_hectares,district,block,panchayat,village,gender,social_category,water_source,pond_activity,is_insured,latitude,longitude';
      sampleRow = 'K Sahani,9334241896,Pond 1,0.4047,Begusarai,Begusarai,CHANDPURA,Chanpura,MALE,ST,BOREWELL,GROW_OUT,FALSE,25.427602,86.140338';
      filename = 'ponds_import_template.csv';
    } else {
      headers = 'farmer_mobile,pond_name,timestamp,temperature,ph,dissolved_oxygen,ammonia,nitrite,turbidity';
      sampleRow = '9334241896,Pond 1,2026-06-25 08:30:00,28.5,7.2,5.2,0.02,0.01,25.0';
      filename = 'water_quality_import_template.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + "\n" + sampleRow);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/);
    const result: string[][] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cells: string[] = [];
      let insideQuote = false;
      let currentCell = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          cells.push(currentCell.trim().replace(/^['"]|['"]$/g, ''));
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim().replace(/^['"]|['"]$/g, ''));
      result.push(cells);
    }
    
    if (result.length === 0) return { headers: [], rows: [] };
    const headers = result[0];
    const rows = result.slice(1);
    return { headers, rows };
  };
  
  const parseFile = async (selectedFile: File): Promise<{ headers: string[]; rows: string[][] }> => {
    return new Promise((resolve, reject) => {
      const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          if (isExcel) {
            const XLSX = await import('xlsx');
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
            
            if (aoa.length === 0) {
              resolve({ headers: [], rows: [] });
              return;
            }
            
            const headers = (aoa[0] || []).map(h => String(h || '').trim());
            const rows = aoa.slice(1).map(row => {
              const cells: string[] = [];
              for (let i = 0; i < headers.length; i++) {
                cells.push(row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : '');
              }
              return cells;
            });
            
            resolve({ headers, rows });
          } else {
            const text = event.target?.result as string;
            resolve(parseCSV(text));
          }
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = (err) => reject(err);
      
      if (isExcel) {
        reader.readAsArrayBuffer(selectedFile);
      } else {
        reader.readAsText(selectedFile);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setParseErrors([]);
    setImportResult(null);

    try {
      const { headers, rows } = await parseFile(selectedFile);
      if (headers.length === 0) {
        setParseErrors(['The file is empty.']);
        return;
      }
      
      const missingHeaders: string[] = [];
      const lowerHeaders = headers.map(h => h.trim().toLowerCase());
      
      let required: string[] = [];
      if (activeImportType === 'hatcheries') {
        required = ['hatchery_name', 'owner_name', 'owner_mobile', 'district', 'block'];
      } else if (activeImportType === 'ponds') {
        required = ['farmer_name', 'farmer_mobile', 'pond_name', 'area_hectares', 'district', 'block'];
      } else {
        required = ['farmer_mobile', 'pond_name', 'timestamp'];
      }

      required.forEach(req => {
        if (!lowerHeaders.includes(req.toLowerCase())) {
          missingHeaders.push(req);
        }
      });

      if (missingHeaders.length > 0) {
        setParseErrors([`Missing required column headers: ${missingHeaders.join(', ')}`]);
        return;
      }

      const errors: string[] = [];
      rows.forEach((row, idx) => {
        const rowNum = idx + 2;
        
        const getValue = (headerName: string) => {
          const index = lowerHeaders.indexOf(headerName.toLowerCase());
          return index !== -1 ? row[index]?.trim() : '';
        };

        const mobile = getValue(activeImportType === 'hatcheries' ? 'owner_mobile' : 'farmer_mobile');
        if (mobile && !/^\d{10}$/.test(mobile)) {
          errors.push(`Row ${rowNum}: Mobile number must be exactly 10 digits (got "${mobile}")`);
        }

        if (activeImportType === 'ponds') {
          const area = getValue('area_hectares');
          if (area && isNaN(Number(area))) {
            errors.push(`Row ${rowNum}: area_hectares must be a numeric value (got "${area}")`);
          }
        }

        if (activeImportType === 'water_logs') {
          const ph = getValue('ph');
          if (ph && (isNaN(Number(ph)) || Number(ph) < 0 || Number(ph) > 14)) {
            errors.push(`Row ${rowNum}: pH must be a number between 0 and 14 (got "${ph}")`);
          }
          const doVal = getValue('dissolved_oxygen');
          if (doVal && isNaN(Number(doVal))) {
            errors.push(`Row ${rowNum}: dissolved_oxygen must be a numeric value (got "${doVal}")`);
          }
        }
      });

      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([`Failed to parse file: ${err?.message || err}`]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file || parseErrors.length > 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const { headers, rows } = await parseFile(file);
      const lowerHeaders = headers.map(h => h.trim().toLowerCase());

      const jsonRows = rows.map(row => {
        const getValue = (headerName: string) => {
          const index = lowerHeaders.indexOf(headerName.toLowerCase());
          return index !== -1 ? row[index]?.trim() : '';
        };

        const getNum = (headerName: string) => {
          const val = getValue(headerName);
          return val ? Number(val) : null;
        };

        const getBool = (headerName: string) => {
          const val = getValue(headerName)?.toUpperCase();
          if (val === 'TRUE' || val === 'YES' || val === '1') return true;
          if (val === 'FALSE' || val === 'NO' || val === '0') return false;
          return null;
        };

        if (activeImportType === 'hatcheries') {
          return {
            hatchery_name: getValue('hatchery_name'),
            owner_name: getValue('owner_name'),
            owner_mobile: getValue('owner_mobile'),
            district: getValue('district'),
            block: getValue('block'),
            panchayat: getValue('panchayat') || null,
            capacity_kg: getNum('capacity_kg'),
            area_acres: getNum('area_acres'),
            year_completed: getNum('year_completed'),
            social_category: getValue('social_category') || null,
            gender: getValue('gender') || null,
            age: getNum('age'),
            annual_income: getNum('annual_income'),
            disease_occurrence: getValue('disease_occurrence') || null,
            pond_insured: getBool('pond_insured'),
            latitude: getNum('latitude'),
            longitude: getNum('longitude'),
          };
        } else if (activeImportType === 'ponds') {
          return {
            farmer_name: getValue('farmer_name'),
            farmer_mobile: getValue('farmer_mobile'),
            pond_name: getValue('pond_name'),
            area_hectares: getNum('area_hectares'),
            district: getValue('district'),
            block: getValue('block'),
            panchayat: getValue('panchayat') || null,
            village: getValue('village') || null,
            father_or_husband_name: getValue('father_or_husband_name') || null,
            aadhaar_number: getValue('aadhaar_number') || null,
            gender: getValue('gender') || null,
            social_category: getValue('social_category') || null,
            water_source: getValue('water_source') || null,
            pond_activity: getValue('pond_activity') || null,
            is_insured: getBool('is_insured'),
            latitude: getNum('latitude'),
            longitude: getNum('longitude'),
          };
        } else {
          return {
            farmer_mobile: getValue('farmer_mobile'),
            pond_name: getValue('pond_name'),
            timestamp: getValue('timestamp'),
            temperature: getNum('temperature'),
            ph: getNum('ph'),
            dissolved_oxygen: getNum('dissolved_oxygen'),
            ammonia: getNum('ammonia'),
            nitrite: getNum('nitrite'),
            turbidity: getNum('turbidity'),
          };
        }
      });

      const endpoint =
        activeImportType === 'hatcheries'
          ? '/api/v1/admin/import/hatcheries'
          : activeImportType === 'ponds'
          ? '/api/v1/admin/import/ponds'
          : '/api/v1/admin/import/water-logs';

      const res = await api.post<{ success: boolean; message?: string; error?: string }>(endpoint, jsonRows);
      
      if (res.success) {
        setImportResult({ success: true, message: res.message || 'Data imported successfully.' });
        setFile(null);
      } else {
        setImportResult({ success: false, message: res.error || 'Failed to import data.' });
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err?.message || 'A network error occurred while uploading.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const [doThreshold, setDoThreshold] = useState('3.5');
  const [phMin, setPhMin] = useState('6.5');
  const [phMax, setPhMax] = useState('8.5');
  const [ammoniaMax, setAmmoniaMax] = useState('0.05');

  const [tTarget, setTTarget] = useState('766');
  const [tBudget, setTBudget] = useState('10.10');

  const [officerName, setOfficerName] = useState('Shri Anand Kumar');
  const [officerDistrict, setOfficerDistrict] = useState('Madhubani');
  const [officerBlock, setOfficerBlock] = useState('Benipatti');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDoThreshold(localStorage.getItem('thresholds_do') || '3.5');
      setPhMin(localStorage.getItem('thresholds_phMin') || '6.5');
      setPhMax(localStorage.getItem('thresholds_phMax') || '8.5');
      setAmmoniaMax(localStorage.getItem('thresholds_ammonia') || '0.05');

      setTTarget(localStorage.getItem('settings_yojana_target') || '766');
      setTBudget(localStorage.getItem('settings_yojana_budget') || '10.10');

      setOfficerName(localStorage.getItem('settings_officer_name') || 'Shri Anand Kumar');
      setOfficerDistrict(localStorage.getItem('settings_officer_district') || 'Madhubani');
      setOfficerBlock(localStorage.getItem('settings_officer_block') || 'Benipatti');
    }
  }, []);

  const handleSaveWater = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('thresholds_do', doThreshold);
      localStorage.setItem('thresholds_phMin', phMin);
      localStorage.setItem('thresholds_phMax', phMax);
      localStorage.setItem('thresholds_ammonia', ammoniaMax);
    }
    alert('Global alert thresholds updated successfully in LocalStorage!');
  };

  const handleSaveYojana = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_yojana_target', tTarget);
      localStorage.setItem('settings_yojana_budget', tBudget);
    }
    alert('Yojana annual target and budget caps updated successfully!');
  };

  const handleSaveOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings_officer_name', officerName);
      localStorage.setItem('settings_officer_district', officerDistrict);
      localStorage.setItem('settings_officer_block', officerBlock);
    }
    alert(`Jurisdiction updated: ${officerName} assigned to ${officerBlock} block, ${officerDistrict} district.`);
  };


  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Admin Console
        </div>
        <h1 className="text-2xl font-bold text-ink-primary">Global Settings & Configuration</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Global Water Quality Alert Thresholds */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <BellRing className="h-4 w-4 text-teal-400" />
            Biological Parameter Thresholds
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Configure the trigger values for automatic emergency SMS alerts sent to farmers and veterinary path alerts.
          </p>

          <form onSubmit={handleSaveWater} className="space-y-4 text-xs flex-1">
            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Critical Dissolved Oxygen (mg/L)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={doThreshold}
                  onChange={(e) => setDoThreshold(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">mg/L</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  Minimum pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phMin}
                  onChange={(e) => setPhMin(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  Maximum pH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={phMax}
                  onChange={(e) => setPhMax(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Maximum Ammonia (ppm)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={ammoniaMax}
                  onChange={(e) => setAmmoniaMax(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">ppm</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Thresholds
            </button>
          </form>
        </GlassCard>

        {/* Yojana Target Configurator */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-teal-400" />
            Yojana social Targets Config
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Define target unit output caps and expenditure guidelines for state direct benefit schemes.
          </p>

          <form onSubmit={handleSaveYojana} className="space-y-4 text-xs flex-1">
            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Select Yojana Program
              </label>
              <select className="w-full bg-canvas-950/80 border border-glass-border text-ink-secondary text-xs rounded-lg p-2.5 outline-none focus:border-teal-500/50 transition-colors">
                <option value="TMVSY">Talab Matsyiki Vishesh Sahayata (TMVSY)</option>
                <option value="JKSY">Jalkrishi Saurikaran Yojana (JKSY)</option>
                <option value="MPVY">Matsya Prajati ka Vividhikaran (MPVY)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Annual Target (Total Units)
              </label>
              <input
                type="number"
                value={tTarget}
                onChange={(e) => setTTarget(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Unit Budget Cap (Lakhs INR)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={tBudget}
                  onChange={(e) => setTBudget(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">Lakhs</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Update Scheme Rules
            </button>
          </form>
        </GlassCard>

        {/* Officer Jurisdiction Assignments */}
        <GlassCard className="p-5 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-ink-primary flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-400" />
            Officer Jurisdiction Console
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Assign regional jurisdiction controls to District and Block Fishery Officers.
          </p>

          <form onSubmit={handleSaveOfficer} className="space-y-4 text-xs flex-1">
            <div className="space-y-1.5">
              <label className="text-ink-secondary block font-semibold">
                Officer Name
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  District
                </label>
                <input
                  type="text"
                  value={officerDistrict}
                  onChange={(e) => setOfficerDistrict(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-ink-secondary block font-semibold">
                  Block
                </label>
                <input
                  type="text"
                  value={officerBlock}
                  onChange={(e) => setOfficerBlock(e.target.value)}
                  className="w-full bg-canvas-950/80 border border-glass-border focus:border-teal-500/50 rounded-lg p-2.5 text-ink-primary placeholder-ink-muted outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Reassign Officer
            </button>
          </form>
        </GlassCard>
      </div>

      {admin?.role === 'superadmin' && (
        <GlassCard className="p-6 flex flex-col gap-6 mt-6">
          <div>
            <h3 className="text-base font-bold text-ink-primary flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-teal-400" />
              Legacy Data Ingestion Console
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed mt-1">
              Upload historical CSV files to sync legacy records with the MatsyaMitra databases. Validated against the Bihar location hierarchy and user registrations.
            </p>
          </div>

          {/* Ingestion Tabs */}
          <div className="flex gap-2 border-b border-glass-border pb-3">
            {(
              [
                { id: 'hatcheries', label: 'Hatcheries Registry' },
                { id: 'ponds', label: 'Farmers & Ponds' },
                { id: 'water_logs', label: 'Water Quality Logs' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveImportType(t.id);
                  setFile(null);
                  setParseErrors([]);
                  setImportResult(null);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  activeImportType === t.id
                    ? 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                    : 'text-ink-secondary border-transparent hover:bg-glass'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Upload Zone */}
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-ink-secondary font-semibold">Select Ingestion File (.csv, .xlsx, .xls)</span>
                <button
                  onClick={() => downloadCSVTemplate(activeImportType)}
                  className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download CSV Template
                </button>
              </div>

              {!file ? (
                <div className="border border-dashed border-glass-border hover:border-teal-500/30 transition-colors rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-canvas-950/20 text-center relative">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="h-10 w-10 text-ink-muted" />
                  <div>
                    <p className="text-xs text-ink-primary font-bold">
                      Drag & drop your file (.csv, .xlsx, .xls) here, or click to browse
                    </p>
                    <p className="text-[10px] text-ink-muted mt-1">
                      CSV and Excel files are supported
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-canvas-950/40 border border-glass-border p-4 rounded-xl text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="h-5 w-5 text-teal-400 shrink-0" />
                      <div className="truncate">
                        <p className="font-bold text-ink-primary truncate">{file.name}</p>
                        <p className="text-[10px] text-ink-muted">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFile(null);
                        setParseErrors([]);
                        setImportResult(null);
                      }}
                      className="text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  {parseErrors.length === 0 && (
                    <button
                      onClick={handleUploadSubmit}
                      disabled={isImporting}
                      className="w-full py-3 rounded-lg text-xs font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isImporting ? 'Ingesting Data...' : 'Start Ingestion'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error & Status Reports */}
            <div className="space-y-4">
              {parseErrors.length > 0 && (
                <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    Validation Failed ({parseErrors.length} Errors)
                  </h4>
                  <div className="max-h-[160px] overflow-y-auto text-[11px] text-red-300/80 space-y-1.5 leading-relaxed pr-2">
                    {parseErrors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span>•</span>
                        <span>{err}</span>
                      </div>
                    ))}
                    {parseErrors.length > 10 && (
                      <p className="text-[10px] text-red-400/60 font-semibold italic mt-2">
                        And {parseErrors.length - 10} more errors... Please check your template structure.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {importResult && (
                <div
                  className={`border rounded-xl p-4 flex flex-col gap-2 ${
                    importResult.success
                      ? 'border-teal-500/20 bg-teal-500/5'
                      : 'border-red-500/20 bg-red-500/5'
                  }`}
                >
                  <h4
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      importResult.success ? 'text-teal-400' : 'text-red-400'
                    }`}
                  >
                    {importResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {importResult.success ? 'Ingestion Successful' : 'Ingestion Failed'}
                  </h4>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      importResult.success ? 'text-teal-300/80' : 'text-red-300/80'
                    }`}
                  >
                    {importResult.message}
                  </p>
                </div>
              )}

              {!file && !importResult && parseErrors.length === 0 && (
                <div className="border border-glass-border rounded-xl p-6 flex flex-col items-center justify-center bg-canvas-950/10 text-center min-h-[160px]">
                  <Sliders className="h-8 w-8 text-ink-muted opacity-40 mb-2" />
                  <p className="text-xs text-ink-muted font-medium">Ready for Ingestion</p>
                  <p className="text-[10px] text-ink-muted opacity-60 mt-1 max-w-xs leading-relaxed">
                    Upload a standardized CSV file. We will perform column checks and validate values prior to database upload.
                  </p>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
