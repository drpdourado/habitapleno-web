/**
 * Habita Pleno - Firebase Utility Bridge (Shim)
 * 
 * This file acts as a compatibility layer between the legacy Firebase-dependent 
 * frontend code and the new standalone Node.js API.
 * 
 * Instead of interacting directly with Firestore or Firebase Storage, 
 * these functions now proxy requests to the 'api.ts' (Express/Node backend).
 */

import api from '../services/api';

// --- Constants ---
export const DEFAULT_CONDO_ID = 'dev-condo';
export const currentCondominiumId = () => localStorage.getItem('@HabitarPleno:activeCondoId') || DEFAULT_CONDO_ID;

// --- Types ---
export interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: string;
    profileId?: string;
    unitId?: string;
    condominiumId?: string;
    vinculos?: Array<{
        condominiumId: string;
        role: string;
        profileId: string;
        unitId?: string;
    }>;
}

// --- Data Fetching ---

/**
 * Fetches all users from the Node API.
 * Replaces old fetchAllFirestoreUsers from Firestore collection.
 */
export const fetchAllFirestoreUsers = async (): Promise<UserProfile[]> => {
    try {
        const response = await api.get('/users');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error("Error fetching users via bridge:", error);
        return [];
    }
};

/**
 * Fetches all access profiles (RBAC) from the Node API.
 */
export const fetchAllAccessProfiles = async () => {
    try {
        const response = await api.get('/profiles');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error("Error fetching profiles via bridge:", error);
        return [];
    }
};

/**
 * Fetches all condominiums from the platform (Superadmin use).
 */
export const fetchAllFirestoreCondos = async () => {
    try {
        const response = await api.get('/condos');
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error("Error fetching condos via bridge:", error);
        return [];
    }
};

/**
 * Synchronizes all relevant data for a specific condominium.
 */
export const fetchAllData = async () => {
    try {
        const response = await api.get('/condo/sync-all');
        return response.data?.data || response.data || {};
    } catch (error) {
        console.error("Error syncing data via bridge:", error);
        return {};
    }
};

// --- Operations ---

/**
 * Initial setup for a new condominium (Onboarding).
 */
export const setupNewCondo = async (uid: string, condoName: string, fullName: string, email: string, phone: string) => {
    return api.post('/auth/setup-condo', {
        uid,
        condoName,
        fullName,
        email,
        phone
    });
};

/**
 * Saves specific condominium configuration.
 */
export const saveFirestoreCondominium = async (tenantId: string, data: any) => {
    return api.put(`/condos/${tenantId}`, data);
};

export const saveAccessProfile = async (profile: any) => {
    if (profile.id && !profile.id.startsWith('profile_')) {
        return api.put(`/profiles/${profile.id}`, profile);
    }
    return api.post('/profiles', profile);
};

export const deleteAccessProfile = async (id: string) => {
    return api.delete(`/profiles/${id}`);
};

// --- Storage / File Management ---

/**
 * Uploads a file to the server (Node API will handle S3, GridFS, or local storage).
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', path);

        const response = await api.post('/storage/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        // The API should return the public URL of the uploaded file
        return response.data?.url || response.data?.data?.url || '';
    } catch (error) {
        console.error("Error uploading file via bridge:", error);
        throw new Error("Falha no upload do arquivo.");
    }
};

/**
 * Removes a file reference.
 */
export const deleteFileFromStorage = async (url: string) => {
    try {
        if (!url) return;
        return api.delete('/storage/file', { data: { url } });
    } catch (error) {
        console.error("Error deleting file via bridge:", error);
    }
};
