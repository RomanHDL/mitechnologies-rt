import { apiFetch } from "./apij";

// GET /api/admin/users?search=...
export const adminGetUsers = (search = "") => {
    const q = search && search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return apiFetch(`/api/admin/users${q}`, { method: "GET" });
};

// POST /api/admin/users
export const adminCreateUser = (payload) => {
    return apiFetch(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
};

// POST /api/admin/users/:id/toggle
export const adminToggleUser = (id) => {
    return apiFetch(`/api/admin/users/${id}/toggle`, { method: "POST" });
};

// POST /api/admin/users/:id/reset-password
export const adminResetPassword = (id, newPassword) => {
    return apiFetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
    });
};

// POST /api/admin/users/:id/reset-pin
export const adminResetPin = (id, newPin) => {
    return apiFetch(`/api/admin/users/${id}/reset-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin }),
    });
};