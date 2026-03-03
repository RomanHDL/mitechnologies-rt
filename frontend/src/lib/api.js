import axios from "axios";

// ✅ 1) Primero intenta variable de Vercel
// ✅ 2) Si no existe, y NO estás en localhost, usa Railway como fallback
// ✅ 3) Si estás en local, usa localhost:5000
const ENV_BASE =
    import.meta.env.VITE_API_BASE_URL;

const FALLBACK_PROD = "https://mitechnologies-rt-production.up.railway.app";
const FALLBACK_LOCAL = "http://localhost:5000";

const API_BASE = ENV_BASE ?
    ENV_BASE :
    (typeof window !== "undefined" && window.location.hostname !== "localhost") ?
    FALLBACK_PROD :
    FALLBACK_LOCAL;

export function api() {
    const instance = axios.create({ baseURL: API_BASE });

    instance.interceptors.request.use((config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    return instance;
}