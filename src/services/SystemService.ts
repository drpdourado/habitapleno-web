import api from './api';

/**
 * SystemService handles core module data CRUD operations.
 */
export const systemService = {
  /**
   * General sync for all condominium modules.
   */
  reloadCondoData: async () => {
    try {
      const response = await api.get('/condo/sync');
      return { success: true, data: response.data?.data || response.data };
    } catch (error: any) {
      console.error("Error reloading condo data:", error);
      return { success: false, error: error.response?.data?.message || 'Erro ao sincronizar dados.' };
    }
  },

  /**
   * Fetches all registered users for the platform or tenant.
   */
  fetchAllUsers: async () => {
    try {
      const response = await api.get('/users');
      return { success: true, data: response.data?.data || response.data };
    } catch (error: any) {
       console.error("Error fetching users:", error);
       return { success: false, error: 'Falha ao buscar usuários.' };
    }
  },

  /**
   * Generic fetch for any system resource (units, areas, history, etc.)
   */
  fetchResource: async (resource: string) => {
    try {
      const response = await api.get(`/${resource}`);
      return { success: true, data: response.data?.data || response.data };
    } catch (error: any) {
      console.error(`Error fetching resource ${resource}:`, error);
      return { success: false, error: `Falha ao carregar ${resource}.` };
    }
  },

  /**
   * Sync/Save settings
   */
  updateSettings: async (settings: any) => {
    try {
      const response = await api.put('/condo/settings', settings);
      return { success: true, data: response.data?.data || response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || 'Erro ao salvar configurações.' };
    }
  }
};
