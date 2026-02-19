import axios from "axios";

const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export function api() {
    const instance = axios.create({ baseURL: API_BASE });

    instance.interceptors.request.use((config) => {
        const token = localStorage.getItem("token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });

    return instance;
}