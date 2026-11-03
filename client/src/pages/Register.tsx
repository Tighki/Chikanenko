import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Logo } from "../components/Logo";
import { Banner, Button, Field } from "../components/ui";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await register({ fullName, email, phone, password });
      navigate("/app/profile");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось зарегистрироваться");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-aside">
        <div>
          <Logo className="logo logo-hero" />
          <h1>Заявка на место</h1>
          <p>После регистрации заполните анкету, выберите льготу и приложите подтверждающие документы.</p>
        </div>
        <div>Регистрация доступна только абитуриентам.</div>
      </aside>
      <section className="auth-panel">
        <form className="panel stack" onSubmit={onSubmit}>
          <div>
            <h2>Регистрация</h2>
            <p className="lede">Учётную запись сотрудника создаёт администратор.</p>
          </div>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Field label="ФИО">
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </Field>
          <Field label="Почта">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </Field>
          <Field label="Телефон">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </Field>
          <Field label="Пароль">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required />
          </Field>
          <Button type="submit" disabled={pending}>{pending ? "Создаём…" : "Создать учётную запись"}</Button>
          <div>
            Уже есть вход? <Link to="/login">Вернуться</Link>
          </div>
        </form>
      </section>
    </div>
  );
}
