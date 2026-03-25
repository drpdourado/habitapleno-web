// src/services/AdminService.ts
import api from './api';

export const adminService = {
    isMonthClosed: (id: string, closures: any[]) => {
        if (!id || !closures) return false;
        return closures.some(c => c.id === id || c.referenceMonth === id.replace('-', '/'));
    },



    createMonthSnapshot: async (data: any, balanceResult?: any) => {
        try {
            const payload = balanceResult ? { ...data, ...balanceResult } : data;
            const res = await api.post('/financial/close-month', payload);
            return { success: true, data: res.data };
        } catch (err: any) {
            return { success: false, error: err.response?.data?.message || 'Erro ao processar snapshot' };
        }
    },

    deleteMonthSnapshot: async (id: string) => {
        try {
            const res = await api.delete(`/financial/closures/${id}`);
            return { success: true, data: res.data };
        } catch (err: any) {
            return { success: false, error: err.response?.data?.message || 'Erro ao excluir snapshot' };
        }
    },

    prepareUnitConciliation: (data: any) => {
        // Logic for reconciling unit payments
        return data.map((unit: any) => ({
            ...unit,
            reconciled: !!unit.bankTransactionId
        }));
    }
};

export default adminService;
