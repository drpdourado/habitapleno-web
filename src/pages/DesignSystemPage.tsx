import React, { useState } from 'react';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaCard } from '../components/ui/HabitaCard';
import { HabitaTable, HabitaTHead, HabitaTBody, HabitaTR, HabitaTH, HabitaTD } from '../components/ui/HabitaTable';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaStatCard } from '../components/ui/HabitaStatCard';
import { HabitaStatGrid } from '../components/ui/HabitaStatGrid';
import { HabitaStatGrid1x3 } from '../components/ui/HabitaStatGrid1x3';
import { HabitaStatGrid3x1 } from '../components/ui/HabitaStatGrid3x1';
import { HabitaChartContainer } from '../components/ui/HabitaChartContainer';
import { HabitaInput, HabitaSelect, HabitaTextarea } from '../components/ui/HabitaForm';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaCombobox, type HabitaOption } from '../components/ui/HabitaCombobox';
import { HabitaTabs } from '../components/ui/HabitaTabs';
import { HabitaMobileTabs } from '../components/ui/HabitaMobileTabs';
import { HabitaAvatar } from '../components/ui/HabitaAvatar';
import { HabitaToast } from '../components/ui/HabitaToast';
import { HabitaCalendar } from '../components/ui/HabitaCalendar';
import { HabitaDatePicker } from '../components/ui/HabitaDatePicker';
import { HabitaMonthPicker } from '../components/ui/HabitaMonthPicker';
import { HabitaFullCalendar } from '../components/ui/HabitaFullCalendar';
import { HabitaShortcut } from '../components/ui/HabitaShortcut';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaNavigation, type HabitaNavigationGroup } from '../components/ui/HabitaNavigation';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaFileUpload } from '../components/ui/HabitaFileUpload';
import { 
  Palette, 
  Calendar,
  MousePointer2,
  DollarSign,
  Users,
  TrendingUp,
  CreditCard,
  ExternalLink,
  Plus,
  Wrench,
  Layout,
  Type,
  Box,
  Info,
  Shield,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Gauge,
  FileText,
  Settings,
  Navigation,
  Menu,
  Pencil,
  Trash2,
  Eye,
  Lock as LockIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', value: 4000 },
  { name: 'Fev', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Abr', value: 2780 },
  { name: 'Mai', value: 1890 },
  { name: 'Jun', value: 2390 },
];

const DesignSystemPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comboSimple, setComboSimple] = useState('manutencao');
  const [comboSearch, setComboSearch] = useState('');
  const [comboMulti, setComboMulti] = useState<string[]>(['bloco-a']);
  const [showToast, setShowToast] = useState(false);
  const [toastConfig, setToastConfig] = useState<{ message: string; type: 'success' | 'error' }>({ message: '', type: 'success' });
  const [sampleDate, setSampleDate] = useState<Date>(new Date());
  const [sampleMonth, setSampleMonth] = useState('2026-03');
  const [activeTab, setActiveTab] = useState('t1');

  const categoryOptions: HabitaOption[] = [
    { value: 'manutencao', label: 'Manutenção' },
    { value: 'limpeza', label: 'Limpeza' },
    { value: 'seguranca', label: 'Segurança' },
    { value: 'infra', label: 'Infraestrutura' },
    { value: 'admin', label: 'Administrativo' },
  ];

  const unitOptions: HabitaOption[] = [
    { value: 'bloco-a', label: 'Bloco A' },
    { value: 'bloco-b', label: 'Bloco B' },
    { value: 'bloco-c', label: 'Bloco C' },
    { value: 'area-comum', label: 'Área Comum' },
    { value: 'piscina', label: 'Piscina' },
  ];

  const navGroups: HabitaNavigationGroup[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', icon: <Box />, to: '/design-system' },
        { label: 'Unidades', icon: <Users />, to: '/units', badge: 12 },
        { label: 'Leituras', icon: <Gauge />, to: '/readings' },
      ]
    },
    {
      title: 'Administração',
      items: [
        { label: 'Financeiro', icon: <DollarSign />, to: '/financial' },
        { label: 'Documentos', icon: <FileText />, to: '/documents' },
        { label: 'Relatórios', icon: <BarChart3 />, to: '/reports' },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { label: 'Configurações', icon: <Settings />, to: '/settings' },
        { label: 'Central de Ajuda', icon: <Info />, to: '/help' },
      ]
    }
  ];

  const userMock = {
    name: 'Henrique Dourado',
    role: 'SÍNDICO GERAL',
  };

  const ComponentLabel = ({ name }: { name: string }) => (
    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
        <CheckCircle2 size={12} />
        <span className="text-[10px] font-black uppercase tracking-widest">{name}</span>
    </div>
  );

  return (
    <div className="w-full space-y-12 animate-in fade-in duration-500 pb-32">
      {/* Hero Header */}
      <HabitaCard variant="indigo" padding="none" className="overflow-hidden border-none" allowOverflow>
        <div className="p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
          <div className="relative z-10">
            <HabitaHeading 
              level={1} 
              icon={<Palette size={48} className="text-white" />}
              subtitle="Especificações Técnicas e Guia de Componentes do Design System Habitapleno"
              subtitleClassName="text-indigo-100 font-medium"
              className="text-white border-none p-0 mb-2"
            >
              Atlas de Interface
            </HabitaHeading>
            <div className="flex gap-4 mt-8">
                <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1">Versão Library</span>
                    <span className="text-sm font-bold text-white font-mono">v1.5.0-refined</span>
                </div>
                <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block mb-1">Padrão Visual</span>
                    <span className="text-sm font-bold text-white">Elegant Precision</span>
                </div>
            </div>
          </div>
        </div>
      </HabitaCard>

      {/* --- Categoria 0: Interface Unificada --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<Layout size={20} />} subtitle="O padrão mestre de todas as páginas do sistema">0. Interface Unificada</HabitaHeading>
        <div className="space-y-4">
            <ComponentLabel name="HabitaContainer (Unified Interface)" />
            <HabitaContainer className="min-h-[400px]">
                <HabitaContainerHeader 
                    title="Título da Página Unificada" 
                    subtitle="DESCRIÇÃO DA OPERAÇÃO E CONTEXTO DO MÓDULO"
                    icon={<Shield size={24} />}
                    actions={
                        <HabitaButton size="sm" icon={<Plus size={16} />}>Ação Principal</HabitaButton>
                    }
                />
                <HabitaContainerContent padding="md" className="bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <HabitaHeading level={3}>Área de Filtros / Conteúdo</HabitaHeading>
                            <div className="h-32 bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Placeholder de Conteúdo</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <HabitaHeading level={3}>Área de Resultados</HabitaHeading>
                            <div className="h-32 bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center">
                                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Placeholder de Conteúdo</span>
                            </div>
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>
        </div>
      </section>

      {/* --- Categoria 1: Tipografia & Identidade --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<Type size={20} />} subtitle="Elementos básicos de hierarquia e semântica">1. Fundamentos & Tipografia</HabitaHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HabitaCard>
                <ComponentLabel name="HabitaHeading" />
                <div className="space-y-6 mt-4">
                    <div>
                        <HabitaHeading level={1}>Heading Level 1</HabitaHeading>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">30px | Black | -0.05em tracking</p>
                    </div>
                    <div>
                        <HabitaHeading level={2}>Heading Level 2</HabitaHeading>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">20px | Black | -0.05em tracking</p>
                    </div>
                    <div>
                        <HabitaHeading level={3}>Heading Level 3</HabitaHeading>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">18px | Black | -0.05em tracking</p>
                    </div>
                    <div>
                        <HabitaHeading level={4}>Heading Level 4</HabitaHeading>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">14px | Black | Uppercase | 0.05em tracking</p>
                    </div>
                </div>
            </HabitaCard>
            <HabitaCard>
                <ComponentLabel name="HabitaCard Variants" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                        <HabitaCard variant="white" padding="sm" className="h-20 flex items-center justify-center border-dashed">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">white (default)</span>
                        </HabitaCard>
                        <HabitaCard variant="slate" padding="sm" className="h-20 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">slate</span>
                        </HabitaCard>
                    </div>
                    <div className="space-y-2">
                        <HabitaCard variant="indigo" padding="sm" className="h-20 flex items-center justify-center border-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">indigo</span>
                        </HabitaCard>
                        <HabitaCard variant="integrated" padding="sm" className="h-20 flex items-center justify-center bg-slate-50 border-none shadow-none">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">integrated</span>
                        </HabitaCard>
                    </div>
                </div>
            </HabitaCard>
        </div>
      </section>

      {/* --- Categoria 2: Botões & Atalhos --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<MousePointer2 size={20} />} subtitle="Componentes de clique e navegação rápida">2. Interatividade Controlada</HabitaHeading>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <HabitaCard className="lg:col-span-2">
                <ComponentLabel name="HabitaButton" />
                <div className="space-y-8 mt-4">
                    <div className="flex flex-wrap gap-4">
                        <div className="space-y-2">
                            <HabitaButton variant="primary">Primary</HabitaButton>
                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Primary</p>
                        </div>
                        <div className="space-y-2">
                            <HabitaButton variant="secondary">Secondary</HabitaButton>
                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Secondary</p>
                        </div>
                        <div className="space-y-2">
                            <HabitaButton variant="outline">Outline</HabitaButton>
                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Outline</p>
                        </div>
                        <div className="space-y-2">
                            <HabitaButton variant="ghost">Ghost</HabitaButton>
                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Ghost</p>
                        </div>
                        <div className="space-y-2">
                            <HabitaButton variant="danger">Danger</HabitaButton>
                            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Danger</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-100">
                        <HabitaButton size="sm">Small (h-8)</HabitaButton>
                        <HabitaButton size="md">Medium (h-10)</HabitaButton>
                        <HabitaButton size="lg">Large (h-12)</HabitaButton>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-100">
                        <HabitaButton icon={<Plus size={16} />}>Com Ícone</HabitaButton>
                        <HabitaButton isLoading>Processando...</HabitaButton>
                        <HabitaButton disabled>Desabilitado</HabitaButton>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <ComponentLabel name="HabitaIconActionButton" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Variantes de Ação</p>
                                <div className="flex flex-wrap gap-3">
                                    <HabitaIconActionButton icon={<Pencil />} variant="primary" tooltip="Editar" />
                                    <HabitaIconActionButton icon={<Trash2 />} variant="danger" tooltip="Excluir" />
                                    <HabitaIconActionButton icon={<CheckCircle2 />} variant="success" tooltip="Confirmar" />
                                    <HabitaIconActionButton icon={<AlertTriangle />} variant="warning" tooltip="Atenção" />
                                    <HabitaIconActionButton icon={<Eye />} variant="secondary" tooltip="Visualizar" />
                                    <HabitaIconActionButton icon={<LockIcon />} variant="ghost" tooltip="Privado" />
                                    <HabitaIconActionButton icon={<Plus />} variant="outline" tooltip="Adicionar Novo" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Escala de Tamanhos</p>
                                <div className="flex flex-wrap items-end gap-3">
                                    <HabitaIconActionButton icon={<Settings />} size="xs" variant="outline" />
                                    <HabitaIconActionButton icon={<Settings />} size="sm" variant="outline" />
                                    <HabitaIconActionButton icon={<Settings />} size="md" variant="outline" />
                                    <HabitaIconActionButton icon={<Settings />} size="lg" variant="outline" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </HabitaCard>
            <HabitaCard>
                <ComponentLabel name="HabitaBadge" />
                <div className="space-y-6 mt-4">
                    <div className="flex flex-wrap gap-2">
                        <HabitaBadge variant="neutral">Neutro</HabitaBadge>
                        <HabitaBadge variant="indigo">Premium</HabitaBadge>
                        <HabitaBadge variant="success">Sucesso</HabitaBadge>
                        <HabitaBadge variant="warning">Aviso</HabitaBadge>
                        <HabitaBadge variant="error">Erro</HabitaBadge>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                        <HabitaBadge size="xs">Extra Small</HabitaBadge>
                        <HabitaBadge size="sm">Small (Default)</HabitaBadge>
                    </div>
                </div>
            </HabitaCard>
            <HabitaCard className="lg:col-span-3">
                <ComponentLabel name="HabitaShortcut" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    <div className="space-y-4">
                        <HabitaHeading level={4}>Variante Horizontal</HabitaHeading>
                        <div className="flex flex-wrap gap-3">
                            <HabitaShortcut icon={<DollarSign size={18} />} label="Financeiro" iconClassName="text-emerald-500" />
                            <HabitaShortcut icon={<Users size={18} />} label="Moradores" iconClassName="text-indigo-500" />
                            <HabitaShortcut icon={<Wrench size={18} />} label="Manutenção" iconClassName="text-amber-500" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <HabitaHeading level={4}>Variante Grid (Mobile)</HabitaHeading>
                        <div className="grid grid-cols-4 gap-4">
                            <HabitaShortcut variant="grid" icon={<DollarSign />} label="Fin." iconClassName="text-emerald-500" />
                            <HabitaShortcut variant="grid" icon={<Users />} label="Mor." iconClassName="text-indigo-500" />
                            <HabitaShortcut variant="grid" icon={<Wrench />} label="Man." iconClassName="text-amber-500" />
                            <HabitaShortcut variant="grid" icon={<Shield />} label="Seg." iconClassName="text-rose-500" />
                        </div>
                    </div>
                </div>
            </HabitaCard>
        </div>
      </section>

      {/* --- Categoria 3: Formulários & Inputs --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<CreditCard size={20} />} subtitle="Campos de entrada, seleção e validação">3. Captura & Gestão de Dados</HabitaHeading>
        <div className="grid grid-cols-1 gap-6">
            <HabitaCard allowOverflow>
                <ComponentLabel name="HabitaForm Elements (Input, Select, Textarea)" />
                <div className="space-y-8 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <HabitaInput label="HabitaInput" placeholder="Digite seu texto..." />
                        <HabitaSelect label="HabitaSelect">
                            <option>Opção 1</option>
                            <option>Opção 2</option>
                        </HabitaSelect>
                        <HabitaInput label="HabitaInput (Erro)" error="Campo obrigatório" defaultValue="Valor com erro" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <HabitaTextarea label="HabitaTextarea" placeholder="Digite descrições detalhadas aqui..." />
                        <HabitaInput label="HabitaInput (Desabilitado)" disabled value="Este campo não pode ser editado" />
                    </div>
                </div>
            </HabitaCard>

            <HabitaCard allowOverflow>
                <ComponentLabel name="HabitaCombobox & HabitaFileUpload" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    <div className="space-y-8">
                        <HabitaCombobox 
                            label="HabitaCombobox (Simple)" 
                            options={categoryOptions} 
                            value={comboSimple} 
                            onChange={setComboSimple} 
                        />
                        <HabitaCombobox 
                            label="HabitaCombobox (Searchable)" 
                            options={categoryOptions} 
                            value={comboSearch} 
                            onChange={setComboSearch} 
                            searchable 
                            placeholder="Pesquisar..."
                        />
                        <HabitaCombobox 
                            label="HabitaCombobox (MultiSelect)" 
                            options={unitOptions} 
                            value={comboMulti} 
                            onChange={setComboMulti} 
                            multiSelect 
                            placeholder="Selecione múltiplos..."
                        />
                    </div>
                    <div className="space-y-8 h-full flex flex-col pt-1.5">
                        <HabitaFileUpload 
                            label="Upload de Documentos (HabitaFileUpload)"
                            multiple
                            description="PDF, PNG, JPG ou DOC até 10MB"
                        />
                    </div>
                </div>
            </HabitaCard>
        </div>
      </section>

      {/* --- Categoria 4: Datas & Agendas --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<Calendar size={20} />} subtitle="Controladores temporais e calendários complexos">4. Gestão Temporal</HabitaHeading>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <HabitaCard className="lg:col-span-1" allowOverflow>
                <ComponentLabel name="HabitaDatePicker" />
                <div className="space-y-6 mt-4">
                    <HabitaDatePicker label="Data Simples" value={sampleDate} onChange={setSampleDate} />
                    <HabitaDatePicker label="Data Especial" value={new Date()} className="border-indigo-500" />
                </div>
            </HabitaCard>
            <HabitaCard className="lg:col-span-1" allowOverflow>
                <ComponentLabel name="HabitaMonthPicker" />
                <div className="space-y-6 mt-4">
                    <HabitaMonthPicker label="Mês de Referência" value={sampleMonth} onChange={setSampleMonth} />
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-1 mt-6">
                        Formato Técnico: {sampleMonth}
                    </p>
                </div>
            </HabitaCard>
            <HabitaCard className="lg:col-span-1" allowOverflow>
                <ComponentLabel name="HabitaCalendar" />
                <div className="flex justify-center mt-4">
                    <HabitaCalendar 
                        selectedDate={sampleDate}
                        onSelect={setSampleDate}
                        className="scale-90 origin-top"
                    />
                </div>
            </HabitaCard>
            <HabitaCard className="lg:col-span-3" allowOverflow>
                <ComponentLabel name="HabitaFullCalendar" />
                <div className="mt-4">
                    <HabitaFullCalendar 
                        events={[
                            { id: '1', date: new Date().toISOString().split('T')[0], title: 'Reunião de Condomínio', type: 'confirmed' },
                            { id: '2', date: new Date().toISOString().split('T')[0], title: 'Manutenção Preventiva', type: 'pending' },
                        ]}
                    />
                </div>
            </HabitaCard>
        </div>
      </section>

      {/* --- Categoria 5: Tabelas & Métricas --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<BarChart3 size={20} />} subtitle="Exibição de massa de dados e indicadores chave">5. Analytics & Tabelas</HabitaHeading>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-4 flex flex-col gap-2">
                <ComponentLabel name="HabitaStatCard" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <HabitaStatCard label="Saldo HabitaStatCard" value="R$ 12.500" icon={<DollarSign />} variant="indigo" trend={{ value: '12%', type: 'up' }} />
                    <HabitaStatCard label="Métrica HabitaStatCard" value="84%" icon={<TrendingUp />} variant="emerald" />
                    <HabitaStatCard label="Aviso HabitaStatCard" value="03" icon={<AlertTriangle />} variant="amber" />
                    <HabitaStatCard label="Erro HabitaStatCard" value="0.2%" icon={<Users />} variant="rose" trend={{ value: '0.8%', type: 'down' }} />
                </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-2 mt-8">
                <ComponentLabel name="HabitaStatGrid (Consolidated KPIs)" />
                <div className="max-w-4xl">
                    <HabitaStatGrid 
                        title="Indicadores de Performance"
                        icon={<Gauge />}
                        metrics={[
                            {
                                label: "ENTRADAS MÊS",
                                value: "R$ 42.850",
                                icon: <DollarSign />,
                                variant: "emerald",
                                subtext: "+12.5% vs anterior"
                            },
                            {
                                label: "TAXA DE INADIMPLÊNCIA",
                                value: "4.2%",
                                icon: <AlertTriangle />,
                                variant: "rose",
                                subtext: "Crítico: 5 unidades"
                            },
                            {
                                label: "RESERVAS ATIVAS",
                                value: "18",
                                icon: <Calendar />,
                                variant: "indigo",
                                subtext: "Próximos 7 dias"
                            },
                            {
                                label: "MANUTENÇÕES",
                                value: "03",
                                icon: <Wrench />,
                                variant: "amber",
                                subtext: "Pendentes hoje"
                            }
                        ]}
                    />
                </div>
            </div>

            <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="flex flex-col gap-2">
                    <ComponentLabel name="HabitaStatGrid1x3 (1x3 Layout)" />
                    <HabitaStatGrid1x3 
                        title="Resumo Operacional"
                        icon={<CheckCircle2 />}
                        metrics={[
                            { label: "EM DIA", value: "142", icon: <CheckCircle2 />, variant: "emerald" },
                            { label: "PENDENTES", value: "23", icon: <AlertTriangle />, variant: "amber" },
                            { label: "ATRASADOS", value: "05", icon: <Plus />, variant: "rose" }
                        ]}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <ComponentLabel name="HabitaStatGrid3x1 (3x1 Layout)" />
                    <div className="max-w-md">
                        <HabitaStatGrid3x1 
                            title="Monitoramento de Caixa"
                            icon={<DollarSign />}
                            metrics={[
                                { label: "SALDO ATUAL", value: "R$ 152.400", subtext: "Conta Corrente", variant: "indigo" },
                                { label: "FUNDO RESERVA", value: "R$ 45.000", subtext: "Investimento CDI", variant: "emerald" },
                                { label: "INADIMPLÊNCIA", value: "R$ 8.900", subtext: "Estimado Acumulativo", variant: "rose" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            <HabitaCard className="lg:col-span-2" padding="none">
                <div className="p-6 pb-0">
                    <ComponentLabel name="HabitaTable" />
                </div>
                <HabitaTable className="mt-4">
                    <HabitaTHead>
                        <HabitaTR>
                            <HabitaTH>ID</HabitaTH>
                            <HabitaTH>Status</HabitaTH>
                            <HabitaTH align="right">Valor</HabitaTH>
                        </HabitaTR>
                    </HabitaTHead>
                    <HabitaTBody>
                        <HabitaTR>
                            <HabitaTD className="font-bold">Item 01</HabitaTD>
                            <HabitaTD><HabitaBadge variant="success">OK</HabitaBadge></HabitaTD>
                            <HabitaTD align="right">R$ 120,00</HabitaTD>
                        </HabitaTR>
                        <HabitaTR>
                            <HabitaTD className="font-bold">Item 02</HabitaTD>
                            <HabitaTD><HabitaBadge variant="warning">Pendente</HabitaBadge></HabitaTD>
                            <HabitaTD align="right">R$ 450,00</HabitaTD>
                        </HabitaTR>
                    </HabitaTBody>
                </HabitaTable>
            </HabitaCard>

            <HabitaChartContainer 
                className="lg:col-span-2"
                title="HabitaChartContainer" 
                subtitle="Preview de bar chart com estilo corporativo"
                legend={[{ label: 'Consumo', color: '#6366f1' }]}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </HabitaChartContainer>
        </div>
      </section>

      {/* --- Categoria 6: Layout & Feedback --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<Layout size={20} />} subtitle="Navegação em abas, diálogos e feedback visual">6. Estrutura & UX</HabitaHeading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HabitaCard allowOverflow>
                <div className="space-y-8 mt-2">
                    <div>
                        <ComponentLabel name="HabitaTabs" />
                        <div className="mt-3">
                            <HabitaTabs 
                                tabs={[
                                    { id: 't1', label: 'Overview', icon: <Box size={14} /> },
                                    { id: 't2', label: 'Finance', icon: <DollarSign size={14} /> },
                                ]}
                                activeTab={activeTab}
                                onChange={setActiveTab}
                            />
                        </div>
                    </div>
                    <div className="pt-6 border-t border-slate-100">
                        <ComponentLabel name="HabitaMobileTabs" />
                        <div className="mt-3">
                            <HabitaMobileTabs 
                                tabs={[
                                    { id: 't1', label: 'Overview', icon: <Box size={14} /> },
                                    { id: 't2', label: 'Finance', icon: <DollarSign size={14} /> },
                                ]}
                                activeTab={activeTab}
                                onChange={setActiveTab}
                                label="Menu Mobile"
                            />
                        </div>
                    </div>
                </div>
            </HabitaCard>

            <HabitaCard allowOverflow>
                <div className="space-y-8 mt-2">
                    <div>
                        <ComponentLabel name="HabitaAvatar" />
                        <div className="flex items-end gap-6 mt-3">
                            <HabitaAvatar size="lg" name="Habita Avatar" />
                            <HabitaAvatar size="md" name="Habita Avatar" />
                            <HabitaAvatar size="sm" name="Habita Avatar" />
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-100">
                        <ComponentLabel name="HabitaToast" />
                        <div className="flex gap-4 mt-3">
                            <HabitaButton variant="outline" size="sm" onClick={() => { setShowToast(true); setToastConfig({ message: 'Exemplo de Sucesso (HabitaToast)', type: 'success' }); }}>Simular Sucesso</HabitaButton>
                            <HabitaButton variant="outline" size="sm" onClick={() => { setShowToast(true); setToastConfig({ message: 'Exemplo de Erro (HabitaToast)', type: 'error' }); }}>Simular Erro</HabitaButton>
                        </div>
                    </div>
                </div>
            </HabitaCard>

            <HabitaCard className="lg:col-span-2 flex flex-col items-center justify-center py-12 bg-slate-50 border-dashed" allowOverflow>
                <ComponentLabel name="HabitaModal" />
                <HabitaHeading level={3} className="text-slate-400 mt-4 border-none p-0 inline-block">HabitaModal Preview</HabitaHeading>
                <HabitaButton 
                    className="mt-6 shadow-xl shadow-indigo-200"
                    icon={<ExternalLink size={16} />} 
                    onClick={() => setIsModalOpen(true)}
                >
                    Disparar HabitaModal
                </HabitaButton>

                <HabitaModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    title="HabitaModal Component"
                    footer={
                        <div className="flex gap-2">
                             <HabitaButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</HabitaButton>
                             <HabitaButton onClick={() => setIsModalOpen(false)}>Confirmar Ação</HabitaButton>
                        </div>
                    }
                >
                    <div className="p-4 space-y-4">
                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4">
                            <Info className="text-indigo-600 shrink-0" size={20} />
                            <p className="text-sm text-indigo-900 leading-relaxed font-bold">Este modal segue as diretrizes de foco, acessibilidade e transições suaves da marca.</p>
                        </div>
                        <HabitaInput label="Campo de Teste" placeholder="Pode digitar aqui..." />
                    </div>
                </HabitaModal>
            </HabitaCard>
        </div>
      </section>

      {/* --- Categoria 7: Navegação --- */}
      <section className="space-y-6">
        <HabitaHeading level={2} icon={<Navigation size={20} />} subtitle="Estruturas de comando e fluxo do usuário">7. Navegação (HabitaNavigation)</HabitaHeading>
        <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
                <ComponentLabel name="HabitaNavigation (Clean / Surface Mode)" />
                <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex" style={{ height: '600px' }}>
                    {/* Simulation of Sidebar connected to content */}
                    <div className="w-[260px] h-full lg:block hidden">
                        <HabitaNavigation 
                            groups={navGroups} 
                            user={userMock} 
                            brand={{ prefix: 'Habita', suffix: 'Pleno' }}
                            variant="clean"
                            className="h-full border-r-0 shadow-none sticky top-0"
                        />
                    </div>
                    <div className="flex-1 bg-white p-8 overflow-y-auto">
                        <HabitaHeading level={2}>Conteúdo da Página</HabitaHeading>
                        <p className="text-slate-500 mt-4 leading-relaxed">
                            A navegação 'Clean' utiliza o fundo <code>white</code> e uma borda sutil <code>slate-200</code>. 
                            Observe como ela se integra perfeitamente à <b>Superfície Única</b> da aplicação, 
                            proporcionando uma experiência leve e focada no conteúdo.
                        </p>
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200" />
                            <div className="h-32 bg-slate-50 rounded-xl border border-dashed border-slate-200" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <ComponentLabel name="HabitaNavigation (Dark Corporate Mode)" />
                <div className="relative border border-slate-900 rounded-2xl overflow-hidden bg-slate-950 flex" style={{ height: '600px' }}>
                    <div className="w-[260px] h-full lg:block hidden">
                        <HabitaNavigation 
                            groups={navGroups} 
                            user={userMock} 
                            brand={{ prefix: 'Habita', suffix: 'Pleno' }}
                            variant="dark"
                            className="h-full border-r-0 shadow-none sticky top-0"
                        />
                    </div>
                    <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
                        <HabitaHeading level={2} className="text-slate-900 border-slate-200">Visão Geral do Sistema</HabitaHeading>
                        <p className="text-slate-500 mt-4 leading-relaxed">
                            A variante 'Dark' é ideal para painéis de monitoramento ou sistemas de back-office 
                            que exigem alta distinção entre a navegação e a área de trabalho. 
                            Utiliza <code>bg-slate-900</code> com estados ativos em <code>indigo-600</code>.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <ComponentLabel name="Responsividade (Mobile Logic)" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <HabitaCard className="relative overflow-hidden bg-slate-50" padding="none">
                        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Bottom Nav</span>
                        </div>
                        <div className="p-6 h-[200px] flex items-center justify-center text-slate-300 italic text-xs">
                            Área de Conteúdo Mobile
                        </div>
                        <div className="p-4">
                            <div className="bg-white border border-slate-200 h-14 rounded-xl flex items-center justify-around text-slate-400 shadow-lg shadow-indigo-900/5">
                                <Box size={20} className="text-indigo-600" />
                                <Users size={20} />
                                <DollarSign size={20} />
                                <Menu size={20} />
                            </div>
                        </div>
                    </HabitaCard>
                    
                    <HabitaCard padding="md" className="flex flex-col items-center justify-center text-center bg-indigo-50/30 border-dashed">
                        <Navigation size={48} className="text-indigo-400 mb-4" />
                        <HabitaHeading level={3}>Pronto para Uso</HabitaHeading>
                        <p className="text-xs text-slate-500 mt-2">
                            O componente já suporta <code>useLocation</code> do <code>react-router-dom</code> 
                            para gerenciamento automático de estados ativos.
                        </p>
                    </HabitaCard>
                </div>
            </div>
        </div>
      </section>

      {/* Footer Info */}
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center gap-2">
            <Shield size={16} className="text-slate-300" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2026 Habitapleno - Design System Assets</span>
        </div>
        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
            Habita Design System | Doc v1.1
        </div>
      </div>

      {/* Global Toast Monitor */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[9999]">
          <HabitaToast 
            message={toastConfig.message} 
            type={toastConfig.type} 
            onClose={() => setShowToast(false)} 
          />
        </div>
      )}
    </div>
  );
};

export default DesignSystemPage;
