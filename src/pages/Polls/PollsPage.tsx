import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PollList } from './PollList';
import { PollCreate } from './PollCreate';
import { BarChart3, Plus } from 'lucide-react';
import { hasPermission } from '../../utils/rbac';

// Habita Design System
import { HabitaCard } from '../../components/ui/HabitaCard';
import { HabitaHeading } from '../../components/ui/HabitaHeading';
import { HabitaButton } from '../../components/ui/HabitaButton';

export function PollsPage() {
    const { isAdmin, accessProfile } = useAuth();

    // Sindico and admin can create polls
    const canCreatePoll = isAdmin || hasPermission(accessProfile, 'polls', 'all');

    const [isCreating, setIsCreating] = useState(false);

    return (
        <div className="w-full animate-in fade-in duration-500 pb-16">
            {/* Grand Card Branco - Interface Unificada */}
            <HabitaCard padding="none" className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                
                {/* Cabeçalho Unificado */}
                <div className="p-5 md:p-8 pb-8 bg-slate-50/20 border-b border-slate-100 shrink-0">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
                                <BarChart3 size={24} />
                            </div>
                            <div className="flex flex-col">
                                <HabitaHeading level={1} className="mb-0 border-none p-0">
                                    Assembleia Digital
                                </HabitaHeading>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Enquetes, votações e decisões coletivas do condomínio</p>
                            </div>
                        </div>

                        {canCreatePoll && !isCreating && (
                            <HabitaButton
                                onClick={() => setIsCreating(true)}
                                variant="primary"
                                icon={<Plus size={18} />}
                                className="bg-slate-900 border-slate-900 shadow-lg shadow-slate-200"
                            >
                                Nova Enquete
                            </HabitaButton>
                        )}
                    </header>
                </div>

                <div className="p-5 md:p-8 flex-1">
                    {isCreating ? (
                        <PollCreate onBack={() => setIsCreating(false)} />
                    ) : (
                        <PollList />
                    )}
                </div>
            </HabitaCard>
        </div>
    );
}

export default PollsPage;
