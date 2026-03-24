import { useApp } from '../contexts/AppContext';

export const usePlan = () => {
  const { settings, isLoading: appLoading } = useApp();
  
  // O backend agora insere o objeto 'activePlan' dentro do objeto settings no sync
  const plan = settings?.activePlan || null; 
  const loading = appLoading;

  const hasModule = (moduleKey: string): boolean => {
    // Se o plano não existir, assumimos acesso básico (o que for padrão no sistema)
    if (!plan) return true;
    
    // Se o plano tiver uma lista de módulos, verificamos
    if (Array.isArray(plan.modules)) {
      return plan.modules.includes(moduleKey);
    }
    
    return true;
  };

  return { plan, loading, hasModule };
};
export default usePlan;
