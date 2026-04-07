import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { User, Mail, ShieldCheck, LogOut, Key, Fingerprint, Edit2, Check, X, Lock, Phone, Eye, EyeOff, Camera } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { HabitaSpinner } from '../components/ui/HabitaSpinner';
import { HabitaButton } from '../components/ui/HabitaButton';
import { HabitaContainer, HabitaContainerHeader, HabitaContainerContent } from '../components/ui/HabitaContainer';
import { HabitaCard, HabitaCardHeader, HabitaCardContent } from '../components/ui/HabitaCard';
import { HabitaBadge } from '../components/ui/HabitaBadge';
import { HabitaInput } from '../components/ui/HabitaForm';
import { HabitaIconActionButton } from '../components/ui/HabitaIconActionButton';
import { HabitaHeading } from '../components/ui/HabitaHeading';
import { HabitaModal } from '../components/ui/HabitaModal';

import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
    const { user, profile, isAdmin, signOut, resetPassword } = useAuth();
    const navigate = useNavigate();



    const { showToast } = useToast();
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(profile?.name || '');
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [editedPhone, setEditedPhone] = useState(profile?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [localPhotoURL, setLocalPhotoURL] = useState(profile?.photoURL || '');

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Modal state
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);

    const handleSaveField = async (field: 'name' | 'phone', value: string) => {
        if (!profile) return;
        setIsSaving(true);
        try {
            await api.put('/profile', { ...profile, [field]: value });
            if (field === 'name') setIsEditingName(false);
            if (field === 'phone') setIsEditingPhone(false);
            showToast('Informação atualizada com sucesso!', 'success');
            // Force page reload to update profile in context
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            console.error(`Error saving ${field}:`, error);
            showToast(`Erro ao salvar ${field}: ` + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = (field: 'name' | 'phone') => {
        if (field === 'name') {
            setEditedName(profile?.name || '');
            setIsEditingName(false);
        } else if (field === 'phone') {
            setEditedPhone(profile?.phone || '');
            setIsEditingPhone(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setIsUploading(true);
        try {
            // Compress image locally first (~150KB)
            const options = {
                maxSizeMB: 0.15,
                maxWidthOrHeight: 400,
                useWebWorker: true,
            };

            const compressedFile = await imageCompression(file, options);

            // Call the newly created Profile API
            // It handles BOTH Storage Upload and Firestore Update in one go
            const formData = new FormData();
            formData.append('file', compressedFile);
            console.log('Sending photo to /api/profile via POST...');
            const response = await api.post('/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.data?.photoURL) {
                const purePhotoURL = response.data.data.photoURL;
                // Como agora a URL já tem ?alt=media, usamos &t=...
                setLocalPhotoURL(`${purePhotoURL}${purePhotoURL.includes('?') ? '&' : '?'}t=${Date.now()}`);
            }

            showToast('Foto de perfil atualizada com sucesso!', 'success');
            // Mantemos o reload apenas para garantir que o Contexto (useAuth) se atualize
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            console.error('Detailed photo upload error:', error);
            console.error('Error status:', error.response?.status);
            showToast('Erro ao atualizar foto: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
            <HabitaContainer>
                <HabitaContainerHeader
                    title="Meu Perfil"
                    subtitle="Gerencie suas informações de acesso e preferências"
                    icon={<User size={24} />}
                    actions={
                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <HabitaBadge variant="success" size="sm" className="hidden md:flex">
                                    <ShieldCheck size={12} className="mr-1.5" />
                                    Síndico / Administrador
                                </HabitaBadge>
                            )}
                            <HabitaButton
                                onClick={() => setShowSignOutConfirm(true)}
                                variant="outline"
                                className="text-rose-600 border-rose-100 bg-rose-50/30 hover:bg-rose-50"
                                icon={<LogOut size={16} />}
                            >
                                Sair
                            </HabitaButton>
                        </div>
                    }
                />

                <HabitaContainerContent padding="md">

                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
                        {/* Details Column */}
                        <div className="lg:col-span-8 space-y-8">
                            {/* User Header with Avatar */}
                            <HabitaCard padding="lg" className="overflow-hidden relative bg-gradient-to-br from-indigo-50 to-white">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    {/* Avatar with Upload Control */}
                                    <div className="relative group shrink-0">
                                        <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center relative">
                                            {isUploading ? (
                                                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-10 animate-in fade-in">
                                                    <HabitaSpinner size="sm" />
                                                </div>
                                            ) : null}

                                            {localPhotoURL || profile?.photoURL ? (
                                                <img
                                                    src={localPhotoURL || (profile?.photoURL ? `${profile.photoURL}${profile.photoURL.includes('?') ? '&' : '?'}t=${Date.now()}` : '')}
                                                    alt={profile?.name}
                                                    className="w-full h-full object-cover transition-opacity duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-200">
                                                    <User size={64} />
                                                </div>
                                            )}
                                        </div>

                                        <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer transition-all hover:scale-110 active:scale-95 border-2 border-white">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handlePhotoUpload}
                                                disabled={isUploading}
                                            />
                                            <Camera size={18} />
                                        </label>
                                    </div>

                                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 w-full overflow-hidden">
                                            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight leading-none truncate max-w-full">
                                                {profile?.name || 'Seu Nome Aqui'}
                                            </h2>
                                            <div className="flex justify-center md:justify-start">
                                                <HabitaBadge variant="indigo" size="xs" className="font-black">USUÁRIO</HabitaBadge>
                                            </div>
                                        </div>
                                        <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
                                            <Mail size={14} className="text-slate-300" />
                                            {user.email}
                                        </p>
                                    </div>
                                </div>
                            </HabitaCard>

                            {/* User Info */}
                            <HabitaCard padding="none">
                                <HabitaCardHeader className="pb-0">
                                    <HabitaHeading level={3}>Informações Pessoais</HabitaHeading>
                                </HabitaCardHeader>
                                <HabitaCardContent padding="md" className="pt-2 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-1 ml-1">
                                                <User size={12} className="text-indigo-500" />
                                                Nome Completo
                                            </label>
                                            {isEditingName ? (
                                                <div className="flex items-center gap-2">
                                                    <HabitaInput
                                                        value={editedName}
                                                        onChange={(e: any) => setEditedName(e.target.value)}
                                                        placeholder="Seu nome completo"
                                                        containerClassName="flex-1"
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<Check />}
                                                        variant="success"
                                                        size="sm"
                                                        tooltip="Salvar"
                                                        onClick={() => handleSaveField('name', editedName)}
                                                        isLoading={isSaving}
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<X />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Cancelar"
                                                        className="text-slate-400"
                                                        onClick={() => handleCancelEdit('name')}
                                                        disabled={isSaving}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <p className="text-slate-800 font-black text-base tracking-tight uppercase">{profile?.name || 'Não informado'}</p>
                                                    <HabitaIconActionButton
                                                        icon={<Edit2 />}
                                                        variant="ghost"
                                                        size="xs"
                                                        tooltip="Editar nome"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"
                                                        onClick={() => setIsEditingName(true)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-1 ml-1">
                                                <Mail size={12} className="text-indigo-500" />
                                                E-mail de Acesso
                                            </label>
                                            <p className="text-slate-800 font-bold text-base">{user.email}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-1 ml-1">
                                                <Phone size={12} className="text-indigo-500" />
                                                Telefone / WhatsApp
                                            </label>
                                            {isEditingPhone ? (
                                                <div className="flex items-center gap-2">
                                                    <HabitaInput
                                                        type="tel"
                                                        value={editedPhone}
                                                        onChange={(e: any) => {
                                                            let v = e.target.value.replace(/\D/g, '');
                                                            if (v.length > 11) v = v.slice(0, 11);
                                                            if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                                                            if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`;
                                                            setEditedPhone(v);
                                                        }}
                                                        placeholder="(11) 99999-9999"
                                                        containerClassName="flex-1"
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<Check />}
                                                        variant="success"
                                                        size="sm"
                                                        tooltip="Salvar"
                                                        onClick={() => handleSaveField('phone', editedPhone)}
                                                        isLoading={isSaving}
                                                    />
                                                    <HabitaIconActionButton
                                                        icon={<X />}
                                                        variant="ghost"
                                                        size="sm"
                                                        tooltip="Cancelar"
                                                        className="text-slate-400"
                                                        onClick={() => handleCancelEdit('phone')}
                                                        disabled={isSaving}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 group">
                                                    <p className="text-slate-800 font-black text-base tracking-tight uppercase">{profile?.phone || 'Não informado'}</p>
                                                    <HabitaIconActionButton
                                                        icon={<Edit2 />}
                                                        variant="ghost"
                                                        size="xs"
                                                        tooltip="Editar telefone"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400"
                                                        onClick={() => setIsEditingPhone(true)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-1 ml-1">
                                                <Fingerprint size={12} className="text-indigo-500" />
                                                ID do Usuário (UID)
                                            </label>
                                            <p className="text-slate-400 font-mono text-xs break-all">{user.uid}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                                        <div className="p-2.5 bg-white rounded-xl text-slate-400 border border-slate-200 shadow-sm">
                                            <Key size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">Acesso de Admin: {isAdmin ? 'SIM' : 'NÃO'}</h3>
                                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                {isAdmin
                                                    ? 'Seu UID corresponde ao configurado em VITE_ADMIN_UID. Você possui permissões totais para gerenciar unidades, fechar faturamentos e editar fechamentos.'
                                                    : 'Acesso padrão de leitura. Partes críticas do sistema estão ocultas por segurança.'}
                                            </p>
                                        </div>
                                    </div>
                                </HabitaCardContent>
                            </HabitaCard>

                            {/* Segurança e Acesso — Alteração de Senha */}
                            <HabitaCard padding="none">
                                <HabitaCardHeader className="flex flex-row items-center justify-start gap-3 text-left pb-0">
                                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 shadow-sm">
                                        <Lock size={18} />
                                    </div>
                                    <HabitaHeading level={3} subtitle="Alteração de senha da conta">
                                        Segurança e Acesso
                                    </HabitaHeading>
                                </HabitaCardHeader>
                                <HabitaCardContent padding="md" className="pt-2">

                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            if (!user?.email) return;

                                            // Validations
                                            if (!currentPassword) {
                                                showToast('Informe a senha atual.', 'warning');
                                                return;
                                            }
                                            if (newPassword.length < 6) {
                                                showToast('A nova senha deve ter no mínimo 6 caracteres.', 'warning');
                                                return;
                                            }
                                            if (newPassword !== confirmPassword) {
                                                showToast('As senhas não coincidem.', 'warning');
                                                return;
                                            }
                                            if (currentPassword === newPassword) {
                                                showToast('A nova senha deve ser diferente da atual.', 'warning');
                                                return;
                                            }

                                            setIsChangingPassword(true);
                                            try {
                                                await api.post('/profile/change-password', {
                                                    currentPassword,
                                                    newPassword
                                                });

                                                showToast('Senha alterada com sucesso!', 'success');
                                                setCurrentPassword('');
                                                setNewPassword('');
                                                setConfirmPassword('');
                                            } catch (error: any) {
                                                console.error('Erro ao alterar senha:', error);
                                                showToast('Erro ao alterar senha: ' + (error.response?.data?.error || error.message), 'error');
                                            } finally {
                                                setIsChangingPassword(false);
                                            }
                                        }}
                                        className="space-y-6"
                                    >
                                        {/* Current Password */}
                                        <div className="relative group">
                                            <HabitaInput
                                                label="Senha Atual"
                                                type={showCurrentPassword ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e: any) => setCurrentPassword(e.target.value)}
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute right-3 top-[34px] p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                            {/* New Password */}
                                            <div className="relative group">
                                                <HabitaInput
                                                    label="Nova Senha"
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={(e: any) => setNewPassword(e.target.value)}
                                                    placeholder="Mínimo 6 caracteres"
                                                    autoComplete="new-password"
                                                    error={newPassword.length > 0 && newPassword.length < 6 ? "Mínimo 6 caracteres" : undefined}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-[34px] p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                                    tabIndex={-1}
                                                >
                                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            </div>

                                            {/* Confirm New Password */}
                                            <HabitaInput
                                                label="Confirmar Nova Senha"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e: any) => setConfirmPassword(e.target.value)}
                                                placeholder="Repita a nova senha"
                                                autoComplete="new-password"
                                                error={confirmPassword && confirmPassword !== newPassword ? "As senhas não coincidem" : undefined}
                                            />
                                        </div>

                                        {/* Submit */}
                                        <div className="pt-4 flex flex-col sm:flex-row gap-4">
                                            <HabitaButton
                                                type="submit"
                                                isLoading={isChangingPassword}
                                                disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                                variant="primary"
                                                className="px-8 shadow-md"
                                                icon={<Lock size={16} />}
                                            >
                                                Efetivar Nova Senha
                                            </HabitaButton>

                                            <HabitaButton
                                                type="button"
                                                onClick={() => setShowResetPasswordConfirm(true)}
                                                variant="outline"
                                                icon={<Mail size={16} />}
                                            >
                                                Redefinir via E-mail
                                            </HabitaButton>
                                        </div>
                                    </form>
                                </HabitaCardContent>
                            </HabitaCard>
                        </div>

                        {/* Info Card Column */}
                        <div className="lg:col-span-4 space-y-6">
                            <HabitaCard variant="indigo" padding="lg">
                                <ShieldCheck size={32} className="text-white mb-6" />
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Segurança Ativa</h3>
                                <p className="text-indigo-100 text-sm font-medium leading-relaxed mt-4">
                                    Sua sessão é protegida por autenticação oficial do Habitar Pleno. Lembre-se de sempre sair do sistema ao utilizar computadores compartilhados ou de terceiros.
                                </p>
                            </HabitaCard>
                        </div>
                    </div>
                </HabitaContainerContent>
            </HabitaContainer>

            {/* Confirmation Modals */}
            <HabitaModal
                isOpen={showSignOutConfirm}
                onClose={() => setShowSignOutConfirm(false)}
                title="Sair do Sistema"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setShowSignOutConfirm(false)} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton variant="danger" onClick={async () => {
                            await api.post('/auth/logout').catch(() => { });
                            signOut();
                            setShowSignOutConfirm(false);
                            navigate('/login');
                        }} className="flex-1">Confirmar Saída</HabitaButton>
                    </div>
                }
            >
                <div className="py-4 text-center space-y-4">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-100 shadow-sm mb-4">
                        <LogOut size={32} />
                    </div>
                    <p className="text-slate-600 font-medium">Tem certeza que deseja encerrar sua sessão atual?</p>
                </div>
            </HabitaModal>

            <HabitaModal
                isOpen={showResetPasswordConfirm}
                onClose={() => setShowResetPasswordConfirm(false)}
                title="Redefinição de Senha"
                size="sm"
                footer={
                    <div className="flex gap-3 w-full">
                        <HabitaButton variant="outline" onClick={() => setShowResetPasswordConfirm(false)} className="flex-1">Cancelar</HabitaButton>
                        <HabitaButton variant="primary" onClick={async () => {
                            try {
                                await resetPassword(user.email!);
                                showToast('E-mail de redefinição enviado!', 'success');
                            } catch (_e) {
                                showToast('Erro ao enviar e-mail.', 'error');
                            } finally {
                                setShowResetPasswordConfirm(false);
                            }
                        }} className="flex-1">Enviar E-mail</HabitaButton>
                    </div>
                }
            >
                <div className="py-4 text-center space-y-4">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto border border-indigo-100 shadow-sm mb-4">
                        <Mail size={32} />
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                        Enviaremos um link de redefinição para o e-mail:<br />
                        <span className="font-bold text-slate-900">{user.email}</span>
                    </p>
                </div>
            </HabitaModal>
        </div>
    );
};

export default ProfilePage;
