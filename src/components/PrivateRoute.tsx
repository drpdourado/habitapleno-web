import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HabitaSpinner } from './ui/HabitaSpinner';

export const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <HabitaSpinner size="xl" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
