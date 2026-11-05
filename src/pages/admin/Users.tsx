import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { ROLE_LABELS, formatDateTime } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type UserRow = { id: string; email: string; fullName: string; phone: string | null; role: string; createdAt: string };

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: "STAFF", password: "" });
  const [createdPassword, setCreatedPassword] = useState("");
  const [error, setError] = useState("");

  function load() {
    api<{ users: UserRow[] }>("/api/admin/users").then((data) => setUsers(data.users));
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setCreatedPassword("");
    try {
      const data = await api<{ password: string }>("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
      setCreatedPassword(data.password);
      setForm({ fullName: "", email: "", phone: "", role: "STAFF", password: "" });
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать пользователя");
    }
  }

  return (
    <div className="stack">
      <PageHead title="Пользователи" text="Здесь только сотрудники и администраторы. Студенты в этот список не входят: их загружают файлом." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {createdPassword ? <Banner kind="ok">Пользователь создан. Пароль: {createdPassword}</Banner> : null}
      <form className="panel-block grid-form" onSubmit={onSubmit}>
        <Field label="ФИО"><input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></Field>
        <Field label="Почта"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
        <Field label="Телефон"><input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
        <Field label="Роль">
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="STAFF">Сотрудник</option>
            <option value="ADMIN">Администратор</option>
          </select>
        </Field>
        <Field label="Временный пароль"><input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={6} required /></Field>
        <div><Button type="submit">Создать</Button></div>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ФИО</th><th>Почта</th><th>Роль</th><th>Создан</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{ROLE_LABELS[user.role]}</td>
                <td>{formatDateTime(user.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
