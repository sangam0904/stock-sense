// Centralized API Base URL configuration supporting local development and cloud hosting
export const API = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
