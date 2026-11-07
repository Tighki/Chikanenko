import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { Logo } from "../components/Logo";
import { Banner, Button, Field } from "../components/ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <p>Загрузка списка, проверка документов и распределение коек.</p>
        </div>
        <dl className="auth-logins">
          <div>
            <dt>Администратор</dt>
            <dd>admin@hostel.local</dd>
            <dd>Admin123</dd>
          </div>
          <div>
            <dt>Сотрудник</dt>
            <dd>staff@hostel.local</dd>
            <dd>Staff123</dd>
          </div>
        </dl>
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
        </form>
      </section>
    </div>
  );
}
