import { useEffect, useState } from "react";
import { api } from "../api";
import { toast } from "../toast";
import { confirmDialog } from "../confirm";
import { Trash2, UserPlus } from "lucide-react";

const inputCls =
  "w-full px-2.5 py-2 border border-line rounded-md text-[13px] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "block text-[12.5px] font-semibold text-ink mb-1.5";

const emptyForm = { name: "", username: "", email: "", password: "", role: "employee" };

export default function TeamManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);

  const isAdminRole = form.role === "admin";

  const loadUsers = () => {
    setLoading(true);
    api("/users")
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Employees are name-only; only admins carry login credentials.
    const payload = isAdminRole
      ? form
      : { name: form.name, role: "employee" };
    try {
      await api("/users", { method: "POST", body: JSON.stringify(payload) });
      setForm(emptyForm);
      toast(isAdminRole ? "Admin created" : "Employee added");
      loadUsers();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmDialog({
      title: "Remove this person?",
      message: "Their past entries stay, but they can no longer be selected.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/users/${id}`, { method: "DELETE" });
      toast("Removed");
      loadUsers();
    } catch (err: any) {
      toast("Error removing");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-[1.3rem] font-bold text-ink">Team Management</h1>

      <div className="bg-white p-[18px] rounded-lg border border-line">
        <h2 className="text-[13.5px] font-semibold text-ink mb-3.5 flex items-center gap-2">
          <UserPlus size={18} className="text-primary" /> Add Person
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelCls}>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputCls}
            >
              <option value="employee">Employee (name only, no login)</option>
              <option value="admin">Admin (can log in)</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Full Name</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>

          {isAdminRole && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Username</label>
                <input
                  required
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Email (Optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="mt-1 bg-primary text-white px-[18px] py-2.5 rounded-md font-semibold text-[13px] hover:bg-[#1B7FD6] transition-colors"
          >
            {isAdminRole ? "Create Admin" : "Add Employee"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-line overflow-hidden">
        <div className="px-[18px] py-3.5 border-b border-line">
          <h2 className="text-[13.5px] font-semibold text-ink">Current People</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted text-[13px]">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2.5 border-b border-line">Name</th>
                  <th className="px-4 py-2.5 border-b border-line">Login</th>
                  <th className="px-4 py-2.5 border-b border-line">Role</th>
                  <th className="px-4 py-2.5 border-b border-line w-10"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3 font-medium text-ink border-b border-line">{u.name}</td>
                    <td className="px-4 py-3 text-muted border-b border-line">
                      {u.username ? (
                        <>
                          <div>@{u.username}</div>
                          {u.email && <div className="text-[11px]">{u.email}</div>}
                        </>
                      ) : (
                        <span className="text-[11.5px] italic">no login</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-line">
                      <span
                        className={`px-2.5 py-0.5 rounded-xl text-[11.5px] font-semibold ${
                          u.role === "admin"
                            ? "bg-[#F3E8FF] text-[#7E22CE]"
                            : "bg-other text-other-text"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right border-b border-line">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-muted hover:text-negative p-1.5 rounded hover:bg-negative-soft transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
