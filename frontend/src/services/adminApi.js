import { apiFetch } from "./api";

// GET /api/admin/users?search=...
export const adminGetUsers = (search = "") => {
    const q = search && search.trim() ?
        `?search=${encodeURIComponent(search.trim())}` :
        "";
    return apiFetch(`/api/admin/users${q}`, { method: "GET" });
};

export const adminCreateUser = (payload) =>
    apiFetch(`/api/admin/users`, {
        method: "POST",
        body: JSON.stringify(payload),
    });

export const adminToggleUser = (id) =>
    apiFetch(`/api/admin/users/${id}/toggle`, { method: "POST" });

export const adminResetPassword = (id, newPassword) =>
    apiFetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
    });

export const adminResetPin = (id, newPin) =>
    apiFetch(`/api/admin/users/${id}/reset-pin`, {
        method: "POST",
        body: JSON.stringify({ newPin }),
    });