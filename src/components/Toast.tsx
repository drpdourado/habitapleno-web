import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
    duration?: number;
}

const Toast = ({ id, message, type, onClose, duration = 3000 }: ToastProps) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose(id);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
    };

    const styles = {
        success: 'bg-primary-50 border-primary-500 text-primary-800',
        error: 'bg-red-50 border-red-500 text-red-800',
        info: 'bg-secondary-50 border-secondary-500 text-secondary-800',
        warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    };

    const iconColors = {
        success: 'text-primary-500',
        error: 'text-red-500',
        info: 'text-secondary-500',
        warning: 'text-yellow-500',
    };

    return (
        <div
            className={`
        flex items-start gap-3 p-4 rounded border-l-4 shadow-lg
        ${styles[type]}
        animate-slide-in-right
        max-w-md w-full
      `}
            role="alert"
        >
            <div className={iconColors[type]}>{icons[type]}</div>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={() => onClose(id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fechar notificação"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Toast;
