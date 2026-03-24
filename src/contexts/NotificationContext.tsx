import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { HabitaToast, type HabitaToastType } from '../components/ui/HabitaToast';
import api from '../services/api';

interface ToastItem {
  id: number;
  message: string;
  type: HabitaToastType;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  userId?: string;
  link?: string;
}

export interface NotificationContextType {
  showToast: (message: string, type?: HabitaToastType) => void;
  sendNotification: (data: any) => Promise<void>;
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let toastIdCounter = 0;

  const showToast = useCallback((message: string, type: HabitaToastType = 'info') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Publica globalmente para compatibilidade com páginas legadas
  useEffect(() => {
    (window as any).showToast = showToast;
    return () => {
      delete (window as any).showToast;
    };
  }, [showToast]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const reloadNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data?.data || []);
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('@HabitaPleno:token');
    if (token) {
      reloadNotifications();
    }
  }, [reloadNotifications]);

  const sendNotification = async (data: any) => {
    await api.post('/notifications', data);
    await reloadNotifications();
  };

  const markAsRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    await reloadNotifications();
  };

  const markAllAsRead = async () => {
    await api.patch('/notifications/read-all');
    await reloadNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      showToast, 
      sendNotification, 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
      {/* Toast Overlay Root */}
      <div className="toast-container fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
             <HabitaToast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification deve ser usado dentro de um NotificationProvider');
  }
  return context;
};
