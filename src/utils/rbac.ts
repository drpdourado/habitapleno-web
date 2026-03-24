export type SystemModule = 
  | 'dashboard' 
  | 'history' 
  | 'financial' 
  | 'closures' 
  | 'reports' 
  | 'categories' 
  | 'reconciliation' 
  | 'access' 
  | 'ocorrencias' 
  | 'gas' 
  | 'units' 
  | 'manutencoes' 
  | 'packages' 
  | 'mural' 
  | 'contact' 
  | 'polls' 
  | 'documents' 
  | 'improvements' 
  | 'areas' 
  | 'users' 
  | 'profiles' 
  | 'settings' 
  | 'bank_accounts'
  | 'superadmin';

export type AccessLevel = 'none' | 'own' | 'all';

export interface AccessProfile {
  id: string;
  name: string;
  description?: string;
  condominiumId?: string;
  isDefault?: boolean;
  permissions: {
    [K in SystemModule]?: AccessLevel;
  };
}

export const hasPermission = (profile: any, module: string, level: string = 'all'): boolean => {

  if (!profile) return false;
  
  // Perfil administrador tem tudo (Verifica por role ou flag isAdmin)
  if (profile.role === 'admin' || profile.role === 'superadmin' || profile.isAdmin === true) return true;
  
  if (profile.email === 'admin@habitapleno.com.br') return true; // Somente o proprietário da plataforma como fallback seguro
  
  // No legado o perfil de acesso ficava em profile.accessProfile ou era o próprio profile
  const permissions = profile.permissions || profile.accessProfile?.permissions;
  
  if (!permissions) return false;
  
  const perm = permissions[module];
  
  if (!perm) return false;
  
  if (level === 'all') return perm === 'all';
  if (level === 'own') return perm === 'own' || perm === 'all';
  
  return perm === level;
};

export const hasAnyPermission = (profile: any, modules: string[]): boolean => {
  return modules.some(m => hasPermission(profile, m, 'own'));
};

export const getRoleFromProfile = (profile: any): string => {
  if (!profile) return 'resident';
  if (profile.role) return profile.role;
  if (profile.id === 'admin' || profile.name?.toLowerCase().includes('admin')) return 'admin';
  if (profile.id?.includes('sindico') || profile.name?.toLowerCase().includes('sindico')) return 'sindico';
  return 'resident';
};

