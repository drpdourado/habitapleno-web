import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { HabitaModal } from './ui/HabitaModal';
import { HabitaButton } from './ui/HabitaButton';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface UnitType {
    id: string;
    name: string;
}

interface ImportUnitsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => Promise<void>;
    unitTypes: UnitType[];
}

export const ImportUnitsModal: React.FC<ImportUnitsModalProps> = ({ isOpen, onClose, onImport, unitTypes }) => {
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [invalidTypes, setInvalidTypes] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const templateData = [
            { Numero: '101', Bloco: 'A', Proprietario: 'João da Silva', Tipologia: unitTypes[0]?.name || 'Apartamento Padrão' },
            { Numero: '102', Bloco: 'A', Proprietario: 'Maria Oliveira', Tipologia: unitTypes[0]?.name || 'Apartamento Padrão' }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 30 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
        // Exporting as CSV as requested
        XLSX.writeFile(wb, 'Modelo_Importacao_Unidades.csv');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError('');
        setInvalidTypes([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    throw new Error('A planilha está vazia.');
                }

                // Header validation
                const firstRow: any = data[0];
                const hasNumero = 'Numero' in firstRow || 'numero' in firstRow;

                if (!hasNumero) {
                    throw new Error('A planilha deve conter a coluna "Numero". Baixe o modelo para referência.');
                }

                // Strict Typology and Duplication Validation
                const foundInvalidTypes = new Set<string>();
                const seenIds = new Set<string>();
                const localDuplicates = new Set<string>();

                data.forEach((row: any) => {
                    const tipologiaStr = String(row.Tipologia || row.tipologia || '').trim();
                    const numeroStr = String(row.Numero || row.numero || '').trim();
                    const blocoStr = String(row.Bloco || row.bloco || '').trim().toUpperCase();

                    const compositeId = blocoStr ? `${blocoStr}_${numeroStr}` : numeroStr;

                    if (seenIds.has(compositeId)) {
                        localDuplicates.add(compositeId);
                    } else {
                        seenIds.add(compositeId);
                    }

                    if (!tipologiaStr) {
                        foundInvalidTypes.add('[Vazio]');
                    } else {
                        const isMatch = unitTypes.some(t => t.name.trim().toLowerCase() === tipologiaStr.toLowerCase());
                        if (!isMatch) {
                            foundInvalidTypes.add(tipologiaStr);
                        }
                    }
                });

                if (localDuplicates.size > 0) {
                    throw new Error(`Existem unidades duplicadas na planilha: ${Array.from(localDuplicates).join(', ')}`);
                }

                setInvalidTypes(Array.from(foundInvalidTypes));
                setPreviewData(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao ler o arquivo. Certifique-se de que é um Excel ou CSV válido.');
                setPreviewData([]);
            }
        };

        reader.onerror = () => {
            setError('Falha na leitura do arquivo.');
        };

        reader.readAsBinaryString(selectedFile);
    };

    const handleImportClick = async () => {
        if (previewData.length === 0 || invalidTypes.length > 0) return;

        setIsLoading(true);
        setError('');

        try {
            // Transform data mapping Typology to TypeId
            const mappedData = previewData.map(row => {
                const tipologiaName = String(row.Tipologia || row.tipologia || '').trim().toLowerCase();
                const matchedType = unitTypes.find(t => t.name.trim().toLowerCase() === tipologiaName);

                return {
                    Numero: row.Numero || row.numero,
                    Bloco: row.Bloco || row.bloco,
                    Proprietario: row.Proprietario || row.proprietario,
                    TipoId: matchedType ? matchedType.id : ''
                };
            });

            await onImport(mappedData);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro durante a importação.');
        } finally {
            setIsLoading(false);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreviewData([]);
        setInvalidTypes([]);
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const isImportBlocked = previewData.length === 0 || invalidTypes.length > 0 || isLoading;

    return (
        <HabitaModal
            isOpen={isOpen}
            onClose={onClose}
            title="Importação em Lote"
            size="lg"
            footer={
                <div className="flex gap-3 w-full sm:w-auto">
                    <HabitaButton
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 sm:flex-none"
                    >
                        Cancelar
                    </HabitaButton>
                    <HabitaButton
                        onClick={handleImportClick}
                        disabled={isImportBlocked}
                        isLoading={isLoading}
                        className="flex-1 sm:flex-none bg-slate-900 border-slate-900 text-white"
                    >
                        {`IMPORTAR ${previewData.length > 0 && !isImportBlocked ? previewData.length : ''} UNIDADES`}
                    </HabitaButton>
                </div>
            }
        >
            <div className="space-y-6">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                        Cadastre múltiplas unidades via Excel ou CSV
                    </p>
                </div>

                {/* Top Actions */}
                <div className="flex bg-indigo-50/50 p-5 border border-indigo-100 rounded-2xl items-center justify-between gap-6">
                    <div className="flex items-center gap-4 text-indigo-900 text-sm font-medium">
                        <div className="p-3 bg-white rounded-xl text-indigo-600 shadow-sm border border-indigo-100">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight text-xs">Baixe a planilha modelo</p>
                            <p className="text-indigo-600/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Mantenha os cabeçalhos para evitar erros operacionais.</p>
                        </div>
                    </div>
                    <HabitaButton
                        onClick={downloadTemplate}
                        variant="outline"
                        size="sm"
                        className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0"
                        icon={<Download size={14} />}
                    >
                        Modelo
                    </HabitaButton>
                </div>

                {/* General Error Banner */}
                {error && (
                    <div className="bg-rose-50 text-rose-700 border border-rose-200 p-4 rounded-xl flex items-start gap-3 text-[11px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
                        <AlertTriangle size={18} className="shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Typology Validation Errors */}
                {invalidTypes.length > 0 && (
                    <div className="bg-rose-50 text-rose-700 border border-rose-200 p-5 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="shrink-0 text-rose-500" />
                            <p className="text-[11px] font-black uppercase tracking-widest">Tipologias Inválidas Encontradas!</p>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-relaxed bg-white/50 p-3 rounded-xl border border-rose-100">
                            A importação foi bloqueada porque a planilha contém nomenclaturas de tipologia que não estão cadastradas no sistema.
                        </p>
                        <ul className="flex flex-wrap gap-2">
                            {invalidTypes.map(type => (
                                <li key={type} className="px-3 py-1 bg-white border border-rose-200 rounded-lg text-[10px] font-mono font-black text-rose-600">
                                    {type}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Upload Area */}
                {!file ? (
                    <div
                        className="group border-2 border-dashed border-slate-200 rounded-[32px] p-12 bg-slate-50/50 flex flex-col items-center justify-center text-center hover:bg-white hover:border-indigo-400 transition-all cursor-pointer relative overflow-hidden active:scale-[0.99]"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm mb-4 group-hover:scale-110 group-hover:text-indigo-500 transition-all">
                            <UploadCloud size={32} />
                        </div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">Arraste a planilha ou clique para selecionar</h3>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Suporta .xlsx, .xls e .csv</p>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                        />
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Selected File Card */}
                        <div className="flex items-center justify-between border border-slate-100 rounded-2xl p-5 bg-white shadow-sm ring-1 ring-slate-100">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border",
                                    invalidTypes.length > 0 ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-500"
                                )}>
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]">{file.name}</p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                        {(file.size / 1024).toFixed(2)} KB • {previewData.length} registros detectados
                                    </p>
                                </div>
                            </div>
                            <HabitaButton
                                variant="outline"
                                size="sm"
                                onClick={removeFile}
                                disabled={isLoading}
                                className="text-rose-500 border-rose-100 hover:bg-rose-50 h-9"
                            >
                                Alterar
                            </HabitaButton>
                        </div>

                        {/* Preview Table */}
                        {previewData.length > 0 && invalidTypes.length === 0 && (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
                                <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Pré-visualização</h4>
                                    <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-100 px-2.5 py-1 rounded-lg">
                                        EXIBINDO {Math.min(5, previewData.length)} DE {previewData.length}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs whitespace-nowrap">
                                        <thead className="bg-white border-b border-slate-50">
                                            <tr>
                                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Número</th>
                                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Bloco</th>
                                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Proprietário</th>
                                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipologia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 bg-white">
                                            {previewData.slice(0, 5).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-5 py-3 font-black text-slate-800 text-[11px] uppercase">{row.Numero || row.numero || '-'}</td>
                                                    <td className="px-5 py-3 text-slate-600 font-bold uppercase text-[10px]">{row.Bloco || row.bloco || '-'}</td>
                                                    <td className="px-5 py-3 text-slate-600 font-medium">{row.Proprietario || row.proprietario || '-'}</td>
                                                    <td className="px-5 py-3 text-slate-500 font-black uppercase text-[9px] tracking-tight">{row.Tipologia || row.tipologia || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </HabitaModal>
    );
};
