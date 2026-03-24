import { useNotification } from './NotificationContext';

/**
 * Hook de compatibilidade para o ToastContext.
 * Redireciona para o novo NotificationContext que gerencia os Toasts globais.
 */
export const useToast = () => useNotification();

export default useToast;
