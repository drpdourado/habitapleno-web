import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    LogIn, Lock, AlertCircle,
    LineChart, ShieldCheck, CheckCircle2,
    MessageSquare, UserPlus
} from 'lucide-react';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaModal } from '../components/ui/HabitaModal';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaCard } from '../components/ui/HabitaCard';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface LoginPageProps {
    isLoading?: boolean;
    loaderMessage?: string;
    showRetry?: boolean;
    onRetry?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
    isLoading: isExternalLoading = false, 
    loaderMessage = "Autenticando...",
    showRetry = false,
    onRetry
}) => {
    const { signIn, resetPassword } = useAuth();
    const { showToast } = useNotification();
    
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reset State
    const [isResetting, setIsResetting] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await resetPassword(resetEmail);
            showToast(`Link enviado para ${resetEmail}. Verifique sua caixa de entrada (e spam).`, "success");
            setIsResetting(false);
            setResetEmail('');
        } catch (err: any) {
            console.error("Reset error:", err);
            showToast("Falha ao enviar e-mail. Verifique se o endereço está correto.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await signIn(email, password);
            navigate('/');
        } catch (err: any) {
            console.error("Login error:", err);
            setError('Falha ao entrar. Verifique suas credenciais.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans overflow-hidden w-full">

            {/* --- LEFT COLUMN: Marketing (60%) --- */}
            <div className="hidden lg:flex bg-slate-900 w-full lg:w-[55%] relative overflow-hidden flex-col justify-between p-8 lg:px-20 lg:py-12 text-white min-h-screen transition-all animate-in fade-in slide-in-from-left duration-1000">
                {/* Modern Abstract Background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-emerald-950 opacity-100 z-0"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse delay-700"></div>

                {/* Noise Pattern Overlay (Local Data URI) */}
                <div 
                    className="absolute inset-0 opacity-15 mix-blend-overlay pointer-events-none z-[1]"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
                ></div>

                <div className="relative z-10 w-full flex flex-col h-full">
                    {/* Logo Section with subtle animation */}
                    <div className="mb-6">
                        <div className="inline-block p-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl animate-in zoom-in duration-700">
                            <img
                                src="/LogoSistema.png"
                                alt="Logo HabitaPleno"
                                className="h-16 lg:h-20 w-auto object-contain drop-shadow-2xl"
                            />
                        </div>
                    </div>

                    <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                        <HabitaHeading level={1} className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                            A Nova Era da <br />
                            <span className="text-emerald-400">Gestão Condominial</span>
                        </HabitaHeading>

                        <p className="text-lg text-slate-300 font-medium leading-relaxed">
                            Simplifique a vida do síndico, otimize custos e garanta total transparência com uma plataforma completa e intuitiva, feita para conectar administradores e moradores.
                        </p>

                        <div className="space-y-5 pt-4">
                            {[
                                {
                                    icon: <LineChart size={20} />,
                                    title: "Gestão Financeira",
                                    desc: "Conciliação bancária, controle de fluxo de caixa e relatórios financeiros precisos em tempo real.",
                                    color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20"
                                },
                                {
                                    icon: <ShieldCheck size={20} />,
                                    title: "Portaria e Segurança",
                                    desc: "Controle rigoroso de visitantes e prestadores de serviço com registro digital de acessos.",
                                    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
                                },
                                {
                                    icon: <CheckCircle2 size={20} />,
                                    title: "Medições de Consumo",
                                    desc: "Leitura de medidores individualizada (Gás) com cálculo automático e histórico detalhado.",
                                    color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20"
                                },
                                {
                                    icon: <MessageSquare size={20} />,
                                    title: "Comunicação e Ocorrências",
                                    desc: "Mural de avisos digital e gestão eficiente de ocorrências para uma convivência harmoniosa.",
                                    color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20"
                                }
                            ].map((item, i) => (
                                <div key={i} className={cn(
                                    "flex items-start gap-4 p-4 rounded-xl border backdrop-blur-sm transition-all hover:translate-x-2 duration-300",
                                    item.bg, item.border
                                )}>
                                    <div className={cn("p-2 rounded-lg bg-white/5 shrink-0 mt-0.5", item.color)}>
                                        {item.icon}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-base text-white/90">{item.title}</span>
                                        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto pt-10 flex items-center justify-between border-t border-white/5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] opacity-60">
                            © 2026 Habita Pleno • Gestão Condominial
                        </p>
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: Login Form (40%) --- */}
            <div className="w-full lg:w-[45%] bg-white flex flex-col justify-center items-center p-6 lg:p-16 relative z-20 animate-in fade-in slide-in-from-right duration-1000">
                <div className="w-full max-w-md space-y-10">

                    {/* Mobile Header (Logo + Welcome) */}
                    <div className="lg:hidden text-center space-y-4 mb-2 flex flex-col items-center">
                        <div className="inline-block p-3 bg-indigo-50 rounded-2xl mb-2">
                            <img src="/LogoSistema.png" alt="Logo" className="h-10 w-auto object-contain" />
                        </div>
                        <HabitaHeading level={2} className="text-3xl font-black text-slate-900 leading-tight">Entrar na plataforma</HabitaHeading>
                        <p className="text-slate-500 text-sm font-medium">Informe suas credenciais de acesso</p>
                    </div>

                    {/* Desktop Header */}
                    <div className="hidden lg:flex flex-col items-center text-center space-y-2">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-2 shadow-sm border border-indigo-100">
                            <LogIn size={32} />
                        </div>
                        <HabitaBadge variant="indigo" size="xs">ACESSO SEGURO</HabitaBadge>
                        <HabitaHeading level={2} className="text-3xl font-black text-slate-900 leading-tight">Entrar na plataforma</HabitaHeading>
                        <p className="text-slate-500 text-base font-medium">Informe suas credenciais de acesso</p>
                    </div>

                    <HabitaCard variant="white" padding="lg" className="border-slate-100 shadow-xl shadow-slate-200/40">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs flex items-center gap-3 animate-in fade-in zoom-in border border-rose-100 font-bold uppercase tracking-tight">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-5">
                                <HabitaInput
                                    label="Seu E-mail"
                                    type="email"
                                    required
                                    placeholder="exemplo@habita.com"
                                    value={email}
                                    onChange={(e: any) => setEmail(e.target.value)}
                                    className="h-14 px-4 bg-slate-50 border-slate-100 focus:bg-white text-base font-bold transition-all transition-transform active:scale-[0.99]"
                                />

                                <div className="space-y-2">
                                    <HabitaInput
                                        label="Sua Senha"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e: any) => setPassword(e.target.value)}
                                        className="h-14 px-4 bg-slate-50 border-slate-100 focus:bg-white text-base font-bold transition-all"
                                    />
                                    <div className="flex justify-end pr-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsResetting(true)}
                                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <HabitaButton
                                type="submit"
                                isLoading={isLoading}
                                variant="primary"
                                className="w-full h-14 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100 group"
                                icon={<LogIn size={18} className="group-hover:translate-x-1 transition-transform" />}
                            >
                                Acessar Sistema
                            </HabitaButton>
                        </form>
                    </HabitaCard>

                    <div className="text-center space-y-6 pt-4">
                        <div className="flex items-center gap-4 text-slate-200">
                            <div className="h-px bg-slate-100 flex-1" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Novo por aqui?</span>
                            <div className="h-px bg-slate-100 flex-1" />
                        </div>

                        <Link
                            to="/registrar"
                            className="inline-flex items-center justify-center gap-3 w-full h-14 bg-white border-2 border-slate-100 rounded-xl text-slate-700 text-xs font-black uppercase tracking-[0.15em] hover:bg-slate-50 hover:border-indigo-100 hover:text-indigo-600 transition-all active:scale-[0.98] group"
                        >
                            <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
                            Criar minha conta
                        </Link>

                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60 lg:hidden text-center">
                            © 2026 Habita Pleno • Gestão Condominial
                        </p>
                    </div>
                </div>
            </div>

            {/* Loading Overlay when used as Init Screen */}
            {isExternalLoading && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-8 border border-white/20 scale-110">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse rounded-full"></div>
                            <img src="/LogoSistema.png" alt="Logo" className="h-20 w-auto object-contain relative z-10" />
                        </div>
                         <div className="flex flex-col items-center gap-4">
                              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                              <p className="mt-2 text-slate-800 font-black uppercase tracking-[0.2em] text-[10px] transition-all animate-pulse">{loaderMessage}</p>
                              
                              {showRetry && (
                                  <div className="flex flex-col items-center gap-3 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                      <p className="text-[10px] text-slate-400 font-bold max-w-[200px] text-center leading-relaxed">
                                          Isso está demorando mais que o esperado...
                                      </p>
                                      <HabitaButton 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={onRetry}
                                          className="h-10 text-[9px] font-black border-slate-200"
                                      >
                                          Recarregar Sistema
                                      </HabitaButton>
                                  </div>
                              )}
                         </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            <HabitaModal
                isOpen={isResetting}
                onClose={() => { setIsResetting(false); setError(''); }}
                title="Redefinir Senha"
                size="sm"
            >
                <div className="space-y-8 py-4">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                            <Lock size={32} />
                        </div>
                        <HabitaHeading level={3} className="text-slate-900">Problemas para entrar?</HabitaHeading>
                        <p className="text-slate-500 text-xs font-medium leading-relaxed font-bold">
                            Insira seu e-mail e enviaremos um link para você voltar a acessar sua conta.
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-6">
                        <HabitaInput
                            label="E-mail Cadastrado"
                            type="email"
                            required
                            placeholder="seu@email.com"
                            value={resetEmail}
                            onChange={(e: any) => setResetEmail(e.target.value)}
                            className="h-12 border-slate-100 focus:bg-white"
                        />

                        <div className="space-y-3">
                            <HabitaButton
                                type="submit"
                                isLoading={isLoading}
                                variant="primary"
                                className="w-full h-12 text-[10px] font-black"
                            >
                                Enviar Link de Recuperação
                            </HabitaButton>

                            <HabitaButton
                                type="button"
                                variant="ghost"
                                onClick={() => setIsResetting(false)}
                                className="w-full h-10 text-[10px] font-black text-slate-400"
                            >
                                Voltar ao Login
                            </HabitaButton>
                        </div>
                    </form>
                </div>
            </HabitaModal>

        </div>
    );
};

export default LoginPage;
