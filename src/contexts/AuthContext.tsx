import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';

interface User {
  uid: string;
  email: string;
  role: 'admin' | 'user' | 'concierge' | 'operator' | 'sindico' | string;
  name?: string;
  profileId?: string;
  unitId?: string;
  accessProfile?: {
    id: string;
    name: string;
    permissions: Record<string, 'none' | 'own' | 'all'>;
  } | any;
  permissions?: Record<string, string>;
  photoURL?: string;
  vinculos?: any[];
  vinculosCondoIds?: string[];
  condominiumId?: string;
  readNotices?: string[];
  phone?: string;
}



export interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isSuperAdmin: boolean;
  isSelectingCondo: boolean;
  setIsSelectingCondo: (value: boolean) => void;
  accessProfile: any;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string) => Promise<any>;
  signOut: () => void;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  triggerCondoSelection: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSelectingCondo, setIsSelectingCondo] = useState(false);

  const refreshProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data?.data ?? response.data;
      if (userData) {
        setUser(userData);
        localStorage.setItem('@HabitarPleno:user', JSON.stringify(userData));
        
        // Global window stubs (Compatibilidade Legada)
        if (typeof window !== 'undefined') {
          const isUserAdmin = userData.role === 'admin' || userData.role === 'superadmin' || userData.isAdmin === true || userData.email === 'admin@habitarpleno.com.br';
          const isUserSuper = userData.role === 'superadmin' || userData.email === 'admin@habitarpleno.com.br';
          
          (window as any).authContext = {
            user: userData,
            profile: userData,
            accessProfile: userData.accessProfile || { permissions: {} },
            isAdmin: isUserAdmin,
            isSuperAdmin: isUserSuper,
            isOperator: ['operator', 'concierge', 'zelador', 'sindico'].includes(userData.role)
          };
        }
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('@HabitarPleno:user');
      const token = localStorage.getItem('@HabitarPleno:token');
      
      if (token) {
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            
            // Global window stubs (Compatibilidade Legada)
            if (typeof window !== 'undefined') {
              const isUserAdmin = parsedUser.role === 'admin' || parsedUser.role === 'superadmin' || parsedUser.isAdmin === true || parsedUser.email === 'admin@habitarpleno.com.br';
              const isUserSuper = parsedUser.role === 'superadmin' || parsedUser.email === 'admin@habitarpleno.com.br';

              (window as any).authContext = {
                user: parsedUser,
                profile: parsedUser,
                accessProfile: parsedUser.accessProfile || { permissions: {} },
                isAdmin: isUserAdmin,
                isSuperAdmin: isUserSuper,
                isOperator: ['operator', 'concierge', 'zelador', 'sindico'].includes(parsedUser.role)
              };
            }
          } catch (e) {
            console.error("Error parsing stored user:", e);
          }
        }
        
        // Sempre tenta re-sincronizar com o servidor para garantir role/perms atuais
        await refreshProfile();
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, pass: string) => {
    const response = await api.post('/auth/login', { email, password: pass });
    const { token, condoId: cId, user: userData } = response.data?.data ?? response.data ?? {};
    const condoId = cId || (userData as any)?.condominiumId;

    if (token) {
      localStorage.setItem('@HabitarPleno:token', token);
      if (condoId) localStorage.setItem('@HabitarPleno:activeCondoId', condoId);
      if (userData) {
        localStorage.setItem('@HabitarPleno:user', JSON.stringify(userData));
        setUser(userData);
      }
      return; 
    } else {
      throw new Error("Credenciais inválidas ou token não recebido.");
    }
  };

  const signUp = async (email: string, pass: string) => {
    const response = await api.post('/auth/register', { email, password: pass });
    return response.data;
  };

  const signOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    // Navegação: cada chamador deve usar useNavigate() após chamar signOut()
    // O PrivateRoute redireciona automaticamente quando user === null
  };

  const resetPassword = async (email: string) => {
    await api.post('/auth/reset-password', { email });
  };

  const isAdmin = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'superadmin' || (user as any)?.isAdmin === true || user?.email === 'admin@habitarpleno.com.br';
  }, [user]);

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const isSuperRole = 
        user.role === 'superadmin' || 
        user.role === 'admin' || 
        (user as any).isAdmin === true || 
        user.email === 'admin@habitarpleno.com.br';
    if (isSuperRole) return true;
    
    // Fallback: Check for superadmin module permission in the access profile
    const permissions = user.permissions || user.accessProfile?.permissions;
    return permissions?.['superadmin'] === 'all';
  }, [user]);

  const isOperator = useMemo(() => ['operator', 'concierge', 'zelador', 'sindico'].includes(user?.role || ''), [user]);
  const accessProfile = useMemo(() => user?.accessProfile || { permissions: {} }, [user]);

  const value = { 
    user, 
    profile: user,
    loading, 
    isAdmin,
    isOperator,
    isSuperAdmin,
    isSelectingCondo, 
    setIsSelectingCondo,
    accessProfile,
    signIn, 
    signUp,
    signOut, 
    resetPassword,
    refreshProfile,
    triggerCondoSelection: () => setIsSelectingCondo(true)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
