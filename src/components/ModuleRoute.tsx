import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, type SystemModule, type AccessLevel } from '../utils/rbac';
import { HabitaSpinner } from './ui/HabitaSpinner';

interface ModuleRouteProps {
    children: React.ReactNode;
    module: SystemModule;
    level?: AccessLevel;
}

export const ModuleRoute = ({ children, module, level = 'own' }: ModuleRouteProps) => {
    const { user, loading, accessProfile, isAdmin } = useAuth();

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

    // SuperAdmin bypass
    if (isAdmin) return <>{children}</>;

    // Check permissions
    if (!accessProfile) {
        // If no accessProfile is loaded, deny access (redirect to dashboard)
        // This prevents users with "all none" profiles from bypassing permissions
        return <Navigate to="/" replace />;
    }

    if (!hasPermission(accessProfile, module, level)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
