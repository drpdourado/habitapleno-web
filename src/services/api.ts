// src/services/api.ts
import axios from 'axios';

// Vite exige o uso de import.meta.env para acessar o .env
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${apiBaseUrl.replace(/\/+$/, '')}/api`,
});

api.interceptors.request.use((config) => {
  // Pega o token que o Login acabou de salvar
  const token = localStorage.getItem('@HabitarPleno:token');
  const condoId = localStorage.getItem('@HabitarPleno:activeCondoId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (condoId) {
    config.headers['x-condo-id'] = condoId;
  }

  try {
    const userStr = localStorage.getItem('@HabitarPleno:user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      if (userObj?.uid) {
        config.headers['x-user-id'] = userObj.uid;
      }
    }
  } catch (e) {
    console.error('Error attaching x-user-id:', e);
  }

  return config;
});

export default api;