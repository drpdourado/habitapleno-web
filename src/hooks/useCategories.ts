import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { Category } from '../contexts/AppContext';

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/financial/categories');
            if (response.data.success) {
                setCategories(response.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const addCategory = async (name: string, type: 'income' | 'expense') => {
        try {
            const response = await api.post('/financial/categories', { name, type });
            if (response.data.success) {
                await fetchCategories();
            } else {
                throw new Error(response.data.error || 'Erro ao adicionar rúbrica');
            }
        } catch (error) {
            console.error("Error adding category:", error);
            throw error;
        }
    };

    const updateCategory = async (category: Category) => {
        try {
            const response = await api.put(`/financial/categories/${category.id}`, category);
            if (response.data.success) {
                await fetchCategories();
            } else {
                throw new Error(response.data.error || 'Erro ao atualizar rúbrica');
            }
        } catch (error) {
            console.error("Error updating category:", error);
            throw error;
        }
    };

    const deleteCategory = async (id: string) => {
        if (!window.confirm('Deseja realmente excluir esta rúbrica?')) return;
        
        try {
            const response = await api.delete(`/financial/categories/${id}`);
            if (response.data.success) {
                await fetchCategories();
            } else {
                throw new Error(response.data.error || 'Erro ao excluir rúbrica');
            }
        } catch (error) {
            console.error("Error deleting category:", error);
            throw error;
        }
    };

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    return {
        categories,
        incomeCategories,
        expenseCategories,
        isLoading,
        addCategory,
        updateCategory,
        deleteCategory,
        refresh: fetchCategories
    };
}

export default useCategories;
