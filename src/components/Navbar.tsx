import React from 'react';
import {
  Settings, Users, FileText, Gauge, DollarSign,
  History as HistoryIcon, RefreshCcw, ShieldCheck, Megaphone, Shield, MessageSquare,
  ChevronDown, AlertCircle, Wrench, BarChart2, MapPin, Calendar as CalendarIcon, ScanFace, Building2, Crown, Layers, LayoutDashboard, Landmark
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import api from '../services/api';
import { hasPermission } from '../utils/rbac';
import { NotificationBell } from './NotificationBell';
import { ContactShortcut } from './ContactShortcut';
// import { usePlan } from '../hooks/usePlan';
import { usePlan } from '../hooks/usePlan';
import { HabitaNavigation, type HabitaNavigationGroup } from './ui/HabitaNavigation';
import { HabitaModal } from './ui/HabitaModal';
import { HabitaButton } from './ui/HabitaButton';
import { LogOut } from 'lucide-react';

import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { settings, tenantId, switchTenant } = useApp();
  const { user, isAdmin, isSuperAdmin, profile, accessProfile, triggerCondoSelection, signOut } = useAuth();

  const navigate = useNavigate();

  
  // Plan fallback
  const { plan, loading, hasModule } = usePlan();

  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [condos, setCondos] = useState<any[]>([]);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const hasVinculos = (user?.vinculos && user.vinculos.length > 0) || (user?.vinculosCondoIds && user.vinculosCondoIds.length > 0);

  // Effect to load condos for the environment selector
  React.useEffect(() => {
    if (isSuperAdmin || hasVinculos) {
      const loadCondos = async () => {
        try {
          const res = await api.get('/condos');
          setCondos(res.data.data || []);
        } catch (err) {
          console.error("Error loading condos for navbar:", err);
        }
      };
      loadCondos();
    }
  }, [isSuperAdmin, hasVinculos]);

  // Precisão no design:
  const words = (settings.systemName || "HabitaPleno").split(' ');
  const prefix = words.length > 1 ? words.slice(0, 2).join(' ') : words[0];
  const suffix = words.length > 2 ? words.slice(2).join(' ') : (words.length === 2 ? words[1] : '');

  // Definir todos os itens do menu com suas categorias
  const allItems = [
    // ADMINISTRAÇÃO
    { to: "/", icon: <LayoutDashboard />, label: "Início", module: 'dashboard', category: 'admin', end: true, mobileOnly: true },
    { to: "/history", icon: <FileText />, label: "Apuração", module: 'history', category: 'admin' },
    { to: "/financial", icon: <DollarSign />, label: "Financeiro", module: 'financial', category: 'admin', end: true },
    { to: "/financial/encerramento", icon: <Shield />, label: "Encerramento", module: 'closures', category: 'admin' },
    { to: "/reports", icon: <BarChart2 />, label: "Relatórios", module: 'reports', category: 'admin' },
    { to: "/categories", icon: <Settings />, label: "Rubricas", module: 'categories', category: 'admin' },
    { to: "/bank-accounts", icon: <Landmark />, label: "Contas", module: 'bank_accounts', category: 'admin' },
    { to: "/reconciliation", icon: <RefreshCcw />, label: "Conciliação", module: 'reconciliation', category: 'admin' },

    // OPERAÇÃO
    { to: "/access-control", icon: <Shield />, label: "Portaria", module: 'access', category: 'operation' },
    { to: "/concierge", icon: <ScanFace />, label: "Guarita (Check-in)", module: 'access', category: 'operation', minLevel: 'all' },
    { to: "/ocorrencias", icon: <AlertCircle />, label: "Ocorrências", module: 'ocorrencias', category: 'operation' },
    { to: "/mobile-reading", icon: <Gauge />, label: "Medições", module: 'gas', category: 'operation' },
    { to: "/units", icon: <Users />, label: "Unidades", module: 'units', category: 'operation' },
    { to: "/manutencoes", icon: <Wrench />, label: "Manutenções", module: 'manutencoes', category: 'operation' },

    // CONDOMÍNIO
    { to: "/mural", icon: <Megaphone />, label: "Mural", module: 'mural', category: 'condo' },
    { to: "/fale-conosco", icon: <MessageSquare />, label: "Fale com o Síndico", module: 'contact', category: 'condo' },
    { to: "/polls", icon: <BarChart2 />, label: "Assembleia Digital", module: 'polls', category: 'condo' },
    { to: "/documents", icon: <FileText />, label: "Documentos", module: 'documents', category: 'condo' },
    { to: "/improvements", icon: <HistoryIcon />, label: "Memória", module: 'improvements', category: 'condo' },

    // RESERVAS
    { to: "/reservas", icon: <CalendarIcon />, label: "Minhas Reservas", module: 'areas', category: 'reservas', end: true },
    { to: "/reservas/areas", icon: <MapPin />, label: "Gestão de Reservas", module: 'areas', category: 'reservas', minLevel: 'all' },

    // SISTEMA
    { to: "/users", icon: <Users />, label: "Usuários", module: 'users', category: 'system' },
    { to: "/profiles", icon: <ShieldCheck />, label: "Perfis", module: 'profiles', category: 'system' },
    { to: "/settings", icon: <Settings />, label: "Configurações", module: 'settings', category: 'system' },
    // SuperAdmin Only
    { to: "/planos", icon: <Crown />, label: "Planos SaaS", module: 'superadmin', category: 'system' }
  ];

  // Derive user role for plan-based filtering
  const userRole = (() => {
    if (isSuperAdmin || isAdmin) return 'admin';
    if (hasPermission(accessProfile, 'gas', 'all') || hasPermission(accessProfile, 'units', 'all')) return 'operator';
    return 'resident';
  })();

  const filteredItems = allItems.filter(item => {
    // SuperAdmin always sees everything
    if (isSuperAdmin) return true;

    // Use a standard utility for all other profile-based permissions
    const canSeeModule = hasPermission(user, item.module);
    
    // Explicitly hide SuperAdmin module if not authorized
    if (item.module === 'superadmin' && !canSeeModule) return false;

    // Special: Dashboard and Profile are always visible if logged in
    if (item.module === 'dashboard' || item.module === 'profile') return true;

    return canSeeModule;
  }).map(item => {
    // Plan-based filtering: mark items blocked by the plan
    if (isSuperAdmin || item.module === 'superadmin' || item.module === 'dashboard' || item.module === 'profile') {
      return { ...item, blockedByPlan: false, hiddenByPlan: false };
    }
    const moduleAllowed = hasModule(item.module as any) || (item.module === 'bank_accounts' && hasModule('financial'));
    if (!moduleAllowed) {
      // For residents: completely hide. For admin/operator: show with lock.
      if (userRole === 'resident') {
        return { ...item, blockedByPlan: true, hiddenByPlan: true };
      }
      return { ...item, blockedByPlan: true, hiddenByPlan: false };
    }
    return { ...item, blockedByPlan: false, hiddenByPlan: false };
  }).filter(item => !item.hiddenByPlan);

  // Agrupar itens por categoria para o HabitaNavigation
  const navGroups: HabitaNavigationGroup[] = [];

  const adminItems = filteredItems.filter(item => item.category === 'admin');
  if (adminItems.length > 0) {
    navGroups.push({
      title: 'Administração',
      items: adminItems.map(i => ({
        label: i.label,
        icon: i.icon,
        to: i.to,
        end: (i as any).end,
        mobileOnly: (i as any).mobileOnly,
        isBlocked: i.blockedByPlan
      }))
    });
  }

  const operationItems = filteredItems.filter(item => item.category === 'operation');
  if (operationItems.length > 0) {
    navGroups.push({
      title: 'Operação',
      items: operationItems.map(i => ({
        label: i.label,
        icon: i.icon,
        to: i.to,
        end: (i as any).end,
        mobileOnly: (i as any).mobileOnly,
        isBlocked: i.blockedByPlan
      }))
    });
  }

  const condoItems = filteredItems.filter(item => item.category === 'condo');
  if (condoItems.length > 0) {
    navGroups.push({
      title: 'Condomínio',
      items: condoItems.map(i => ({
        label: i.label,
        icon: i.icon,
        to: i.to,
        end: (i as any).end,
        mobileOnly: (i as any).mobileOnly,
        isBlocked: i.blockedByPlan
      }))
    });
  }

  const reservasItems = filteredItems.filter(item => item.category === 'reservas');
  if (reservasItems.length > 0) {
    navGroups.push({
      title: 'Reservas',
      items: reservasItems.map(i => ({
        label: i.label,
        icon: i.icon,
        to: i.to,
        end: (i as any).end,
        mobileOnly: (i as any).mobileOnly,
        isBlocked: i.blockedByPlan
      }))
    });
  }

  const systemItems = filteredItems.filter(item => item.category === 'system');
  if (systemItems.length > 0) {
    navGroups.push({
      title: 'Sistema',
      items: systemItems.map(i => ({
        label: i.label,
        icon: i.icon,
        to: i.to,
        end: (i as any).end,
        mobileOnly: (i as any).mobileOnly,
        isBlocked: i.blockedByPlan
      }))
    });
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    signOut();
    setIsLogoutModalOpen(false);
    navigate('/login');
  };

  const userFormatted = {
    name: profile?.name || user?.email?.split('@')[0] || 'Usuário',
    role: (() => {
      if (isAdmin || isSuperAdmin) return 'SÍNDICO / ADMIN';
      if (hasPermission(accessProfile, 'gas', 'all') || hasPermission(accessProfile, 'units', 'all')) return 'ZELADOR';
      return `UNIDADE ${profile?.unitId || (user?.email?.split('@')[0])} `;
    })(),
    avatar: user?.photoURL || undefined
  };

  return (
    <>
      <HabitaNavigation
        groups={navGroups}
        user={userFormatted}
        onLogout={() => setIsLogoutModalOpen(true)}
        brand={{ prefix, suffix }}
        variant="dark"
        extraHeaderActions={
          <>
            <ContactShortcut />
            <NotificationBell />
          </>
        }
      >
        {/* SaaS Plan Status - Admin Only */}
        {userRole !== 'resident' && (
          <div className="mb-4 mt-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded">
              <Crown size={11} className="text-indigo-400 shrink-0" />
              <span className="text-indigo-300 text-[9px] font-black uppercase tracking-[0.15em] truncate">
                {plan?.name || (loading ? '...' : 'Sem plano')}
              </span>
            </div>
          </div>
        )}

        {/* SuperAdmin Environment Switcher */}
        {(isSuperAdmin || hasPermission(user, 'superadmin')) && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
              className="w-full h-11 px-4 rounded bg-slate-800/50 border border-slate-700 flex items-center justify-between active:scale-95 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Layers size={16} />
                </div>
                <div className="flex flex-col items-start leading-none min-w-0">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ambiente</span>
                  <span className="text-[10px] font-black text-slate-200 uppercase tracking-tight truncate w-full block">
                    {settings.systemName || settings.condoName || 'Produção'}
                  </span>
                </div>
              </div>
              <ChevronDown size={16} className={clsx("text-slate-500 transition-transform", isEnvDropdownOpen && "rotate-180")} />
            </button>

            {isEnvDropdownOpen && (
              <div className="mt-2 w-full bg-slate-800 rounded border border-slate-700 shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {condos.map(condo => (
                  <button
                    key={condo.id}
                    onClick={() => {
                      switchTenant(condo.id);
                      setIsEnvDropdownOpen(false);
                    }}
                    className={clsx(
                      "w-full px-4 py-3 text-left transition-colors flex items-center justify-between group",
                      condo.id === tenantId ? "bg-blue-500/10" : "hover:bg-slate-700/50"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={clsx(
                        "text-[10px] font-black uppercase tracking-tight",
                        condo.id === tenantId ? "text-blue-400" : "text-slate-300"
                      )}>
                        {condo.name}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 font-mono">ID: {condo.id}</span>
                    </div>
                    {condo.id === tenantId && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>
                    )}
                  </button>
                ))}

                {/* Management Link */}
                <div className="mt-2 border-t border-slate-700/50 pt-1">
                  <NavLink
                    to="/condos"
                    onClick={() => setIsEnvDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-blue-400 hover:bg-blue-500/10 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20">
                      <Settings size={12} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Configurar Ambientes</span>
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trocar Condomínio (Multi-vínculo) */}
        {profile?.vinculos && profile.vinculos.length > 1 && (
          <button
            onClick={() => triggerCondoSelection()}
            className="flex items-center gap-3 px-3 py-2 w-full text-blue-300 hover:text-blue-200 transition-colors mt-2 bg-blue-500/5 border border-blue-500/10 rounded-md"
          >
            <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <Building2 size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest truncate">Trocar Condomínio</span>
          </button>
        )}
      </HabitaNavigation>

      <HabitaModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Sair do Sistema"
        size="sm"
        footer={
          <div className="flex gap-3 w-full">
            <HabitaButton variant="outline" onClick={() => setIsLogoutModalOpen(false)} className="flex-1 h-11 text-[10px] uppercase font-black">Manter</HabitaButton>
            <HabitaButton variant="danger" onClick={handleLogout} className="flex-1 h-11 text-[10px] uppercase font-black bg-rose-600 border-rose-600">Sair Agora</HabitaButton>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 border border-rose-100 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
            <LogOut size={32} />
          </div>
          <p className="text-slate-600 font-medium">Deseja realmente desconectar da sua conta?</p>
        </div>
      </HabitaModal>
    </>
  );
};

export default Navbar;
