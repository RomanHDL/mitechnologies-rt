import { useEffect, useMemo, useState } from "react";
import {
  adminCreateUser,
  adminGetUsers,
  adminResetPassword,
  adminResetPin,
  adminToggleUser,
} from "../services/adminApi";

export default function AdminUsers() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  // modal simple (sin librerías)
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    employeeNumber: "",
    fullName: "",
    role: "OPERADOR",
    position: "",
    isActive: true,
  });

  const canSearch = useMemo(() => search.trim().length > 0, [search]);

  async function loadUsers(q = "") {
    setLoading(true);
    try {
      const { data } = await adminGetUsers(q);
      setUsers(data.users || []);
    } catch (e) {
      alert(e?.response?.data?.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(""); // carga inicial
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await adminCreateUser(createForm);
      alert("✅ Usuario creado");
      setCreateForm({
        email: "",
        password: "",
        employeeNumber: "",
        fullName: "",
        role: "OPERADOR",
        position: "",
        isActive: true,
      });
      await loadUsers("");
    } catch (e2) {
      alert(e2?.response?.data?.message || "Error creando usuario");
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(id) {
    if (!confirm("¿Activar/Desactivar usuario?")) return;
    setLoading(true);
    try {
      await adminToggleUser(id);
      await loadUsers(canSearch ? search : "");
    } catch (e) {
      alert(e?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPass(id) {
    const newPassword = prompt("Nueva contraseña:");
    if (!newPassword) return;
    setLoading(true);
    try {
      await adminResetPassword(id, newPassword);
      alert("✅ Contraseña actualizada");
    } catch (e) {
      alert(e?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPin(id) {
    const newPin = prompt("Nuevo PIN (o deja vacío para borrar PIN y forzar set):");
    setLoading(true);
    try {
      await adminResetPin(id, newPin || "");
      alert("✅ PIN actualizado");
      await loadUsers(canSearch ? search : "");
    } catch (e) {
      alert(e?.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Panel Admin - Usuarios</h2>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Buscar, crear, activar/desactivar y resetear credenciales.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por # empleado (ej. 3647)"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
        <button
          onClick={() => loadUsers(search.trim())}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
        >
          Buscar
        </button>
        <button
          onClick={() => {
            setSearch("");
            loadUsers("");
          }}
          disabled={loading}
          style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
        >
          Ver todos
        </button>
      </div>

      {/* Crear usuario */}
      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Crear usuario</h3>
        <form onSubmit={onCreate} style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <input
            value={createForm.employeeNumber}
            onChange={(e) => setCreateForm((p) => ({ ...p, employeeNumber: e.target.value }))}
            placeholder="Número de empleado"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            value={createForm.email}
            onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            value={createForm.password}
            onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Contraseña inicial"
            type="password"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            value={createForm.fullName}
            onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
            placeholder="Nombre completo"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <input
            value={createForm.position}
            onChange={(e) => setCreateForm((p) => ({ ...p, position: e.target.value }))}
            placeholder="Puesto (ej. Montacarguista)"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
          <select
            value={createForm.role}
            onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          >
            <option value="OPERADOR">OPERADOR</option>
            <option value="SUPERVISOR">SUPERVISOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!createForm.isActive}
              onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Activo
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
          >
            Crear
          </button>
        </form>
      </div>

      {/* Lista usuarios */}
      <div style={{ border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
          <strong>Usuarios</strong>
          <span style={{ opacity: 0.7 }}>{loading ? "Cargando..." : `${users.length} encontrados`}</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#fafafa" }}>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Empleado</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Nombre</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Email</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Rol</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Activo</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{u.employeeNumber}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{u.fullName}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{u.email}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>{u.role}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                    {u.isActive ? "✅" : "⛔"}
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => onToggle(u.id)} disabled={loading} style={{ borderRadius: 10, padding: "6px 10px" }}>
                      Activar/Desactivar
                    </button>
                    <button onClick={() => onResetPass(u.id)} disabled={loading} style={{ borderRadius: 10, padding: "6px 10px" }}>
                      Reset Pass
                    </button>
                    <button onClick={() => onResetPin(u.id)} disabled={loading} style={{ borderRadius: 10, padding: "6px 10px" }}>
                      Reset PIN
                    </button>
                  </td>
                </tr>
              ))}

              {!users.length && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 14, opacity: 0.7 }}>
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 14, opacity: 0.7, fontSize: 13 }}>
        Nota: Esta pantalla solo funciona si entraste como ADMIN (tu token).
      </div>
    </div>
  );
}