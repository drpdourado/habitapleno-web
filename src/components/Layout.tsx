import React, { useEffect } from 'react';
import Navbar from './Navbar';
import { useApp } from '../contexts/AppContext';

const Layout = ({ children }: { children: React.ReactNode }) => {
    const { settings } = useApp();

    useEffect(() => {
        document.title = settings.systemName || 'HabitarPleno';
    }, [settings.systemName]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-row">
            {/* Navigation (Sidebar on Desktop, Top Bar on Mobile) */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden md:overflow-y-auto">
                <div className="w-full max-w-[1440px] mx-auto px-4 md:px-6 pt-4 pb-24 md:py-6 transition-all duration-500">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
