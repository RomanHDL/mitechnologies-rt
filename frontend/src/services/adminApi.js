import api from "./api";

export const adminGetUsers = (search = "") =>
    api.get(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const adminCreateUser = (payload) => api.post("/admin/users", payload);

export const adminToggleUser = (id) => api.patch(`/admin/users/${id}/toggle`);

export const adminResetPassword = (id, newPassword) =>
  api.patch(`/admin/users/${id}/reset-password`, { newPassword });

export const adminResetPin = (id, newPin = "") =>
  api.patch(`/admin/users/${id}/reset-pin`, newPin ? { newPin } : {});