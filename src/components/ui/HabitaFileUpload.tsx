import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { HabitaIconActionButton } from './HabitaIconActionButton';
import { HabitaSpinner } from './HabitaSpinner';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface HabitaFileUploadProps {
    label?: string;
    error?: string;
    description?: string;
    accept?: string;
    multiple?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    onChange?: (files: FileList | null) => void;
    onFilesSelected?: (files: File[]) => void;
    className?: string;
    containerClassName?: string;
    value?: File[] | null;
    variant?: 'full' | 'button';
}

export const HabitaFileUpload: React.FC<HabitaFileUploadProps> = ({
    label,
    error,
    description,
    accept,
    multiple = false,
    disabled = false,
    isLoading = false,
    onChange,
    onFilesSelected,
    className,
    containerClassName,
    value = [],
    variant = 'full'
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>(value || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled && !isLoading) setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled || isLoading) return;

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFiles(files);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        if (onChange) onChange(e.target.files);
    };

    const processFiles = (fileList: FileList) => {
        const newFiles = Array.from(fileList);
        let updatedFiles: File[];

        if (multiple) {
            updatedFiles = [...selectedFiles, ...newFiles];
        } else {
            updatedFiles = [newFiles[0]];
        }

        setSelectedFiles(updatedFiles);
        if (onFilesSelected) onFilesSelected(updatedFiles);
    };

    const removeFile = (index: number) => {
        const updatedFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updatedFiles);
        if (onFilesSelected) onFilesSelected(updatedFiles);

        // Reset input if empty
        if (updatedFiles.length === 0 && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleClick = () => {
        if (!disabled && !isLoading) {
            fileInputRef.current?.click();
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (variant === 'button') {
        return (
            <div className={cn("inline-flex flex-col gap-1.5", containerClassName)}>
                {label && (
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        {label}
                    </label>
                )}

                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        multiple={multiple}
                        onChange={handleInputChange}
                        disabled={disabled || isLoading}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={handleClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        disabled={disabled || isLoading}
                        className={cn(
                            "flex items-center justify-center w-11 h-11 rounded-xl transition-all border shadow-sm shrink-0",
                            selectedFiles.length > 0
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-100"
                                : "bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-400 hover:bg-white hover:text-indigo-500",
                            isDragging && "border-indigo-500 bg-indigo-50 scale-110",
                            disabled && "opacity-50 cursor-not-allowed grayscale",
                            className
                        )}
                    >
                        {isLoading ? (
                            <HabitaSpinner size="xs" variant={selectedFiles.length > 0 ? "white" : "primary"} />
                        ) : selectedFiles.length > 0 ? (
                            <CheckCircle2 size={18} />
                        ) : (
                            <Plus size={20} />
                        )}
                    </button>

                    {selectedFiles.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300 bg-white border border-slate-100 px-2 py-1 rounded-lg shadow-lg z-50 whitespace-nowrap">
                            <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">
                                {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos`}
                            </span>
                            {!disabled && !isLoading && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); if (onFilesSelected) onFilesSelected([]); }}
                                    className="p-1 hover:bg-rose-50 rounded-full text-rose-500 transition-colors"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-1.5 mt-1 ml-1 text-rose-500">
                        <AlertCircle size={12} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-1.5", containerClassName)}>
            {label && (
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">
                    {label}
                </label>
            )}

            <div
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative group cursor-pointer transition-all duration-300",
                    "border-2 border-dashed rounded-2xl p-8",
                    "flex flex-col items-center justify-center text-center",
                    isDragging
                        ? "border-indigo-500 bg-indigo-50/50 scale-[1.01]"
                        : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50/50",
                    disabled ? "opacity-50 cursor-not-allowed grayscale" : "",
                    error ? "border-rose-300 bg-rose-50/10" : "",
                    className
                )}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleInputChange}
                    disabled={disabled || isLoading}
                    className="hidden"
                />

                {isLoading && (
                    <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl animate-in fade-in duration-300">
                        <HabitaSpinner size="lg" showLabel label="Processando..." />
                    </div>
                )}

                <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300",
                    isDragging ? "bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
                )}>
                    <UploadCloud size={28} />
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {isDragging ? "Solte para enviar" : "Clique ou arraste arquivos"}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                        {description || (multiple ? "Upload de múltiplos arquivos suportado" : "Selecione um arquivo")}
                    </p>
                </div>

                {/* Subtle border accent */}
                <div className={cn(
                    "absolute inset-0 rounded-2xl pointer-events-none border border-transparent transition-all",
                    isDragging ? "border-indigo-200" : "group-hover:border-indigo-100"
                )} />
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-1.5 mt-1 ml-1 text-rose-500">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                </div>
            )}

            {/* File List */}
            {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {selectedFiles.length} {selectedFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                        </span>
                        {!disabled && !isLoading && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); if (onFilesSelected) onFilesSelected([]); }}
                                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                            >
                                Limpar Tudo
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {selectedFiles.map((file, idx) => (
                            <div
                                key={idx}
                                className="group/file flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all"
                            >
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">
                                        {file.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        {formatSize(file.size)} • {file.type || 'Arquivo'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-500 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                    {!disabled && !isLoading && (
                                        <HabitaIconActionButton
                                            icon={<X />}
                                            variant="ghost"
                                            size="sm"
                                            tooltip="Remover"
                                            className="text-slate-300 pointer-events-auto"
                                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
