export function getToken() {
    return localStorage.getItem("token") || "";
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
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
        const msg = data?.message || `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return data;
}