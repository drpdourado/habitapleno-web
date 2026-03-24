import { useState, useEffect } from 'react';
import { condoService, type VoteDetail } from '../../services/CondoService';
import { Printer, FileText } from 'lucide-react';
import type { Poll } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useApp } from '../../contexts/AppContext';

// Habita Design System
import { HabitaModal } from '../../components/ui/HabitaModal';
import { HabitaTable, HabitaTBody, HabitaTD, HabitaTH, HabitaTHead, HabitaTR } from '../../components/ui/HabitaTable';
import { HabitaButton } from '../../components/ui/HabitaButton';
import { HabitaBadge } from '../../components/ui/HabitaBadge';
import { HabitaSpinner } from '../../components/ui/HabitaSpinner';

interface PollDetailsModalProps {
    poll: Poll;
    isOpen: boolean;
    onClose: () => void;
}

// VoteDetail é importado de CondoService

export function PollDetailsModal({ poll, isOpen, onClose }: PollDetailsModalProps) {
    const [voteDetails, setVoteDetails] = useState<VoteDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const { settings } = useApp();

    useEffect(() => {
        if (!isOpen || !poll.id) return;

        const loadVotes = async () => {
            setLoading(true);
            try {
                // Usar CondoService em vez de Firestore direto
                const result = await condoService.getVoteDetails(poll);
                if (result.success && result.data) {
                    setVoteDetails(result.data);
                } else {
                    console.error('Erro ao carregar votos:', result.error);
                }
            } catch (error) {
                console.error("Erro ao carregar detalhes de votos:", error);
            } finally {
                setLoading(false);
            }
        };

        loadVotes();
    }, [isOpen, poll.id, poll.options]);

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;

        // --- COLORS (Design System — mesmo padrão de PDFReportUtils.ts) ---
        const primaryColor: [number, number, number] = [34, 197, 94];   // Green 500
        const secondaryColor: [number, number, number] = [59, 130, 246]; // Blue 500
        const slate800: [number, number, number] = [30, 41, 59];
        const slate500: [number, number, number] = [100, 116, 139];

        // --- 1. HEADER (mesmo layout do Relatório Mensal) ---
        let currentY = 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(slate800[0], slate800[1], slate800[2]);
        doc.text('RELATÓRIO DE VOTAÇÃO', pageWidth - margin, currentY + 5, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text(`${settings?.condoName || 'Condomínio'} | Assembleia Digital`, pageWidth - margin, currentY + 11, { align: 'right' });

        currentY += 25;

        // --- 2. EXECUTIVE SUMMARY BOX (mesmo roundedRect do sistema) ---
        const summaryBoxHeight = 32;

        doc.setFillColor(248, 250, 252); // Slate 50
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), summaryBoxHeight, 3, 3, 'FD');

        // Coluna 1: Enquete
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text('ENQUETE', margin + 8, currentY + 8);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slate800[0], slate800[1], slate800[2]);
        doc.text(poll.title.substring(0, 35), margin + 8, currentY + 15);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text(poll.description.substring(0, 60), margin + 8, currentY + 21);

        // Coluna 2: Período
        const col2X = margin + 105;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text('PERÍODO', col2X, currentY + 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slate800[0], slate800[1], slate800[2]);
        const startFmt = new Date(poll.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endFmt = new Date(poll.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.text(`${startFmt} até ${endFmt}`, col2X, currentY + 15);

        // Coluna 3: Total Votos
        const col3X = margin + 150;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text('TOTAL DE VOTOS', col3X, currentY + 8);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text(`${voteDetails.length}`, col3X, currentY + 17);

        currentY += summaryBoxHeight + 10;

        // --- 3. TABELA DE RESUMO POR OPÇÃO ---
        const summaryData = poll.options.map((opt) => {
            const count = voteDetails.filter(v => v.votedOption === opt).length;
            const pct = voteDetails.length > 0 ? Math.round((count / voteDetails.length) * 100) : 0;
            return [opt, `${count}`, `${pct}%`];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['Opção de Voto', 'Votos', '%']],
            body: summaryData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'center', fontStyle: 'bold' }
            },
            styles: { fontSize: 9, cellPadding: 3 }
        });

        // --- 4. TABELA DE DETALHAMENTO DOS VOTOS ---
        const afterSummaryY = (doc as any).lastAutoTable?.finalY || currentY + 30;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(slate500[0], slate500[1], slate500[2]);
        doc.text('DETALHAMENTO DOS VOTOS', margin, afterSummaryY + 8);

        autoTable(doc, {
            startY: afterSummaryY + 12,
            head: [['Unidade', 'Morador', 'Voto', 'Data/Hora']],
            body: voteDetails.map(v => [v.unitId || 'Sem Unidade', v.userName || 'Anônimo', v.votedOption || 'N/A', v.timestamp || 'DATA INDISPONÍVEL']),
            theme: 'striped',
            headStyles: {
                fillColor: slate800,
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'left' },
                1: { halign: 'left' },
                2: { halign: 'center' },
                3: { halign: 'center' }
            },
            styles: { fontSize: 8, cellPadding: 3 },
            foot: [['TOTAL', `${voteDetails.length} votos registrados`, '', '']],
            footStyles: {
                fillColor: [241, 245, 249], // Slate 100
                textColor: slate800,
                fontStyle: 'bold',
                halign: 'left'
            }
        });

        // --- 5. FOOTER (padrão do sistema) ---
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const finalY = doc.internal.pageSize.getHeight() - 10;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(slate500[0], slate500[1], slate500[2]);
            doc.text(
                `Relatório gerado automaticamente pelo sistema ${settings?.systemName || 'HabitaPleno'} em ${new Date().toLocaleString('pt-BR')}`,
                margin,
                finalY
            );
            doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, finalY, { align: 'right' });
        }

        // Save
        const safeName = poll.title.replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Votacao_${safeName}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <HabitaModal
            isOpen={isOpen}
            onClose={onClose}
            title="Relatório de Auditoria de Votos"
            size="xl"
            footer={
                <div className="flex justify-end gap-3 w-full">
                    <HabitaButton variant="outline" onClick={onClose} className="px-6">
                        Fechar
                    </HabitaButton>
                    <HabitaButton
                        onClick={handleExportPDF}
                        disabled={loading || voteDetails.length === 0}
                        icon={<Printer size={16} />}
                        className="bg-slate-900 border-slate-900 shadow-xl shadow-slate-200"
                    >
                        Exportar Relatório PDF
                    </HabitaButton>
                </div>
            }
        >
            <div className="space-y-8">
                {/* Header Information */}
                <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <HabitaBadge variant="indigo" size="xs" className="mb-2">ENQUETE DE ASSEMBLEIA</HabitaBadge>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">{poll.title}</h3>
                            <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">{poll.description}</p>
                        </div>
                        <div className="flex flex-row md:flex-col items-center md:items-end gap-4 shrink-0 justify-between">
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participação</div>
                                <div className="text-2xl font-black text-indigo-600 leading-none mt-1">{voteDetails.length} <span className="text-[10px] text-slate-400">Votos</span></div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encerramento</div>
                                <div className="text-xs font-bold text-slate-700 mt-1">{new Date(poll.endDate).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <HabitaSpinner size="lg" variant="primary" showLabel label="Sincronizando Urna Digital..." />
                    </div>
                ) : voteDetails.length === 0 ? (
                    <div className="text-center py-20 px-8 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                        <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Votação sem Registros</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ainda não foram computados votos para esta enquete.</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Visualization */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consolidado por Opção</h4>
                                <div className="h-px bg-slate-100 flex-1" />
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {poll.options.map((opt, idx) => {
                                    const count = voteDetails.filter(v => v.votedOption === opt).length;
                                    const pct = voteDetails.length > 0 ? Math.round((count / voteDetails.length) * 100) : 0;
                                    const variants: ("indigo" | "success" | "warning" | "error" | "neutral")[] = ['indigo', 'success', 'warning', 'error', 'neutral'];
                                    const variant = variants[idx % variants.length];
                                    
                                    return (
                                        <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm group hover:border-indigo-200 transition-all">
                                            <div className="text-2xl font-black text-slate-800 mb-1 leading-none">{pct}%</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate mb-3">{opt}</div>
                                            <HabitaBadge variant={variant} size="xs" className="w-full py-1">
                                                {count} Votos
                                            </HabitaBadge>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trilha de Auditoria</h4>
                                <div className="h-px bg-slate-100 flex-1" />
                            </div>
                            
                            <HabitaTable 
                                headers={['Unidade', 'Morador', 'Voto Computado', 'Data / Hora']}
                                responsive
                                mobileVariant="list"
                            >
                                <HabitaTHead>
                                    <HabitaTR>
                                        <HabitaTH>Unidade</HabitaTH>
                                        <HabitaTH>Morador</HabitaTH>
                                        <HabitaTH>Voto Computado</HabitaTH>
                                        <HabitaTH align="right">Data / Hora</HabitaTH>
                                    </HabitaTR>
                                </HabitaTHead>
                                <HabitaTBody>
                                    {voteDetails.map((v, idx) => (
                                        <HabitaTR key={idx}>
                                            <HabitaTD label="Unidade" className="font-black text-indigo-600 uppercase tracking-tighter">{v.unitId}</HabitaTD>
                                            <HabitaTD label="Morador" className="font-bold text-slate-700">{v.userName}</HabitaTD>
                                            <HabitaTD label="Voto Computado">
                                                <HabitaBadge variant="neutral" size="xs" className="bg-slate-100 border-none font-black">
                                                    {(v.votedOption || 'N/A').toUpperCase()}
                                                </HabitaBadge>
                                            </HabitaTD>
                                            <HabitaTD label="Data / Hora" align="right" className="text-[10px] font-black font-mono text-slate-400 uppercase">
                                                {v.timestamp || 'DATA INDISPONÍVEL'}
                                            </HabitaTD>
                                        </HabitaTR>
                                    ))}
                                </HabitaTBody>
                            </HabitaTable>
                        </div>
                    </>
                )}
            </div>
        </HabitaModal>
    );
}
