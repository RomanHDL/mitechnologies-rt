// lib/api.js

export function getToken() {
    return localStorage.getItem("token") || "";
}

// ✅ helper para query params estilo axios { params: {..} }
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

    const res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
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
        const msg = data?.message || data?.error || `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}

// ✅ NUEVO: wrapper tipo axios para que tu código actual funcione igual
export function api( /* tokenIgnored */ ) {
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
                body: JSON.stringify(body ?? {}),
                headers: config.headers || {},
            });
            return { data };
        },
        put: async(path, body, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, {
                method: "PUT",
                body: JSON.stringify(body ?? {}),
                headers: config.headers || {},
            });
            return { data };
        },
        patch: async(path, body, config = {}) => {
            const finalPath = withParams(path, config.params);
            const data = await apiFetch(finalPath, {
                method: "PATCH",
                body: JSON.stringify(body ?? {}),
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