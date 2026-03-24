// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  // Pega o token que o Login acabou de salvar
  const token = localStorage.getItem('@HabitaPleno:token');
  const condoId = localStorage.getItem('@HabitaPleno:activeCondoId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (condoId) {
    config.headers['x-condo-id'] = condoId;
  }

  return config;
});

export default api;