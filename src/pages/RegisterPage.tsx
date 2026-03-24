import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as dbUtils from '../utils/FirebaseUtils';
import { Building2, User, Mail, Lock, ArrowRight, Phone } from 'lucide-react';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaButton } from '../components/ui/HabitaButton';

const RegisterPage: React.FC = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [condoName, setCondoName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { signUp, user, loading: isAuthLoading, refreshProfile } = useAuth();
    const navigate = useNavigate();

    // Guard: If already logged in, go to home
    if (user && !isAuthLoading && !isLoading) {
        navigate('/');
        return null;
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // 0. Safety Cleanup: Clear any developer session context
        localStorage.clear();
        console.log("Sessão limpa para novo registro.");

        try {
            // 1. Create User in Auth
            const userCredential = await signUp(email, password);
            const user = userCredential.user;

            // Log and Safety Check
            console.log(`Iniciando Onboarding para o Tenant: ${user.uid}`);
            if (user.uid === dbUtils.DEFAULT_CONDO_ID) {
                throw new Error("Conflito de ID: Este usuário coincide com o condomínio mestre de desenvolvimento.");
            }

            // 2. Setup initial Firestore structure (Tenant etc)
            try {
                await dbUtils.setupNewCondo(user.uid, condoName, fullName, email, phone);

                // 2.1 Force auth context update so it bypasses Sincronizando tenant screen instantly
                await refreshProfile();
            } catch (setupErr: any) {
                console.error("Erro crítico no setup inicial do banco. Revertendo conta Auth para permitir nova tentativa...", setupErr);
                // Atomic cleanup: Remove the Auth user so the email isn't blocked for retries
                await user.delete().catch((delErr: any) => console.error("Erro ao limpar conta parcial:", delErr));
                throw setupErr;
            }

            // 3. Success Redirection: Go to Dashboard to trigger Wizard
            navigate('/', {
                state: { message: 'Bem-vindo! Vamos configurar seu condomínio.' }
            });
        } catch (err: any) {
            console.error("Erro no registro:", err);
            if (err.message === "Conflito de ID: Este usuário coincide com o condomínio mestre de desenvolvimento.") {
                setError(err.message);
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso.');
            } else if (err.code === 'auth/weak-password') {
                setError('A senha deve ter pelo menos 6 caracteres.');
            } else {
                setError('Erro ao criar conta. Tente novamente mais tarde.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md z-10">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded shadow-xl shadow-emerald-100 border border-emerald-50 mb-6">
                        <Building2 className="text-emerald-500" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                        Comece Agora
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Crie sua conta de Síndico e gerencie seu condomínio com inteligência.
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white">
                    <form onSubmit={handleRegister} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <HabitaInput
                                label="Nome Completo"
                                icon={<User size={18} />}
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="João Silva"
                                className="bg-slate-50/50"
                            />

                            <HabitaInput
                                label="Nome do Condomínio"
                                icon={<Building2 size={18} />}
                                required
                                value={condoName}
                                onChange={(e) => setCondoName(e.target.value)}
                                placeholder="Ex: Edifício Vista Alegre"
                                className="bg-slate-50/50"
                            />

                            <HabitaInput
                                label="E-mail Profissional"
                                type="email"
                                icon={<Mail size={18} />}
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="exemplo@email.com"
                                className="bg-slate-50/50"
                            />

                            <HabitaInput
                                label="Telefone / WhatsApp (Opcional)"
                                type="tel"
                                icon={<Phone size={18} />}
                                value={phone}
                                onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.length > 11) v = v.slice(0, 11);
                                    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                                    setPhone(v);
                                }}
                                placeholder="(11) 99999-9999"
                                className="bg-slate-50/50"
                            />

                            <HabitaInput
                                label="Senha"
                                type="password"
                                icon={<Lock size={18} />}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="bg-slate-50/50"
                            />
                        </div>

                        <HabitaButton
                            type="submit"
                            isLoading={isLoading}
                            className="w-full h-14 bg-slate-900 border-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 transition-all text-sm uppercase tracking-widest"
                            icon={<ArrowRight size={20} />}
                            iconPosition="right"
                        >
                            Criar Minha Conta
                        </HabitaButton>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-400 text-sm font-medium">
                            Já possui uma conta? {' '}
                            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-black underline underline-offset-4">
                                Fazer Login
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                        Segurança Garantida por Firebase
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
