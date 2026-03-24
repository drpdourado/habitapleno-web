import api from './api';
import type { SystemModule } from '../utils/rbac';

export interface SaaSPlan {
    id: string;
    name: string;
    price: number;
    description?: string;
    modules: SystemModule[];
    isDefault?: boolean;
    createdAt?: string;
    updatedAt?: string;
    active?: boolean;
}

/**
 * Service to manage SaaS plans for condominiums and platform-wide configurations.
 */
export const planService = {
  /**
   * Retrieves all available SaaS plans from the platform.
   */
  getAll: async () => {
    try {
      const response = await api.get('/saas/plans');
      // Supports both standardized {data: ...} and direct array responses
      return { 
        success: true, 
        data: response.data?.data || response.data || []
      };
    } catch (error: any) {
      console.error("Error loading SaaS plans:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro ao carregar planos disponíveis.' 
      };
    }
  },

  /**
   * Saves or updates a SaaS plan definition.
   */
  save: async (plan: SaaSPlan) => {
    try {
      const response = await api.post('/saas/plans', plan);
      return { success: true, data: response.data?.data || response.data };
    } catch (error: any) {
      console.error("Error saving SaaS plan:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro técnico ao salvar plano.' 
      };
    }
  },

  /**
   * Permanently removes a SaaS plan from the platform.
   */
  remove: async (id: string) => {
    try {
      await api.delete(`/saas/plans/${id}`);
      return { success: true };
    } catch (error: any) {
      console.error("Error removing SaaS plan:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro ao remover o plano.' 
      };
    }
  },

  /**
   * Assigns a specific plan to a condominium tenant.
   * This is used for upgrades/downgrades.
   */
  assignPlanToCondo: async (tenantId: string, planId: string) => {
    try {
      const response = await api.post(`/saas/condos/${tenantId}/plan`, { planId });
      return { success: true, data: response.data?.data || response.data };
    } catch (error: any) {
      console.error("Error assigning plan to condo:", error);
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro ao processar alteração de plano.' 
      };
    }
  }
};

export default planService;
