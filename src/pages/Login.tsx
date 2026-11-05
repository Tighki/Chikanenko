import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { Logo } from "../components/Logo";
import { Banner, Button, Field } from "../components/ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("staff@hostel.local");
  const [password, setPassword] = useState("Staff123");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const user = await login(email, password);
      navigate(homeFor(user.role));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось войти");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <div>
          <Logo className="logo logo-hero" />
          <h1>Заселение в общежитие</h1>
          <p>Сотрудник загружает список студентов файлом, проверяет документы и распределяет свободные койки.</p>
          <ol>
            <li>Файл заменяет выгрузку из 1С и создаёт карточки студентов.</li>
            <li>Сотрудник проверяет документы и допускает заявку к распределению.</li>
            <li>Алгоритм предлагает места, сотрудник подтверждает заселение.</li>
          </ol>
        </div>
        <div>Кампания заселения 2026</div>
      </aside>
      <section className="auth-panel">
        <form className="panel stack" onSubmit={onSubmit}>
          <div>
            <h2>Вход</h2>
            <p className="lede">Для сотрудника общежития и администратора.</p>
          </div>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Field label="Почта">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </Field>
          <Field label="Пароль">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Входим…" : "Войти"}</Button>
          <div className="demo-accounts">
            <div>Демонстрация на защите</div>
            <div><code>admin@hostel.local</code> / Admin123</div>
            <div><code>staff@hostel.local</code> / Staff123</div>
          </div>
        </form>
      </section>
    </div>
  );
}
