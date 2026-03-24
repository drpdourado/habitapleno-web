import { AppContextType } from './contexts/AppContext';
import { AuthContextType } from './contexts/AuthContext';

declare global {
  interface Window {
    appContext: AppContextType;
    authContext: Partial<AuthContextType> & { profile?: any };
    showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    notificationContext: { sendNotification: (params: any) => Promise<void> };
  }
}

export {};
