// frontend/src/services/api.js
// Mantiene compatibilidad con apiFetch y agrega apiUpload para Excel/archivos.

export function getToken() {
    return localStorage.getItem("token") || "";
}

function withParams(path, params) {
    if (!params || typeof params !== "object") return path;
    const url = new URL(path, "http://dummy");
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        url.searchParams.set(k, String(v));
    });
    return url.pathname + (url.search ? url.search : "");
}

export async function apiFetch(path, options = {}) {
    const base =
        import.meta.env.VITE_API_URL;
    if (!base) throw new Error("Missing VITE_API_URL");

    const token = getToken();
    const baseClean = String(base).replace(/\/+$/, "");
    const pathClean = String(path).startsWith("/") ? String(path) : `/${String(path)}`;

    const res = await fetch(`${baseClean}${pathClean}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // ojo: NO forzamos Content-Type aquí porque apiUpload usa FormData
            ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        },
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const msg =
            (data && typeof data === "object" && (data.message || data.error)) ||
            (typeof data === "string" && data) ||
            `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

// ✅ NUEVO: subir archivos (Excel) por multipart/form-data
export async function apiUpload(path, fileOrFormData, extraFields = {}) {
    const base =
        import.meta.env.VITE_API_URL;
    if (!base) throw new Error("Missing VITE_API_URL");

    const token = getToken();
    const baseClean = String(base).replace(/\/+$/, "");
    const pathClean = String(path).startsWith("/") ? String(path) : `/${String(path)}`;

    const fd = (fileOrFormData instanceof FormData) ? fileOrFormData : new FormData();

    if (!(fileOrFormData instanceof FormData)) {
        fd.append("file", fileOrFormData);

        Object.entries(extraFields || {}).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            fd.append(k, String(v));
        });
    }

    const res = await fetch(`${baseClean}${pathClean}`, {
        method: "POST",
        body: fd,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    const text = await res.text();
    let data = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const msg =
            (data && typeof data === "object" && (data.message || data.error)) ||
            (typeof data === "string" && data) ||
            `HTTP ${res.status}`;

        throw new Error(msg);
    }

    return data;
}

// ✅ wrapper tipo axios (por si lo usas en otras pantallas)
export function api() {
    return {
        get: async(path, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, { method: "GET" });
            return { data };
        },
        post: async(path, body, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, {
                method: "POST",
                body: JSON.stringify(body || {}),
                headers: config.headers || {},
            });
            return { data };
        },
        put: async(path, body, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, {
                method: "PUT",
                body: JSON.stringify(body || {}),
                headers: config.headers || {},
            });
            return { data };
        },
        patch: async(path, body, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, {
                method: "PATCH",
                body: JSON.stringify(body || {}),
                headers: config.headers || {},
            });
            return { data };
        },
        delete: async(path, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, { method: "DELETE" });
            return { data };
        },
    };
}