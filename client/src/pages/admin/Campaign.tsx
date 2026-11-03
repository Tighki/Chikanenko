import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { dateInput } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type Campaign = {
  name: string;
  startsAt: string;
  endsAt: string;
  checkInFrom: string;
  checkInUntil: string;
  active: boolean;
  isOpen: boolean;
};

export function CampaignPage() {
  const [form, setForm] = useState<Campaign | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ campaign: Campaign }>("/api/campaign").then((data) => setForm(data.campaign));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setError("");
    setMessage("");
    try {
      const data = await api<{ campaign: Campaign }>("/api/admin/campaign", {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          startsAt: dateInput(form.startsAt),
          endsAt: dateInput(form.endsAt),
          checkInFrom: dateInput(form.checkInFrom),
          checkInUntil: dateInput(form.checkInUntil),
          active: form.active,
        }),
      });
      setForm(data.campaign);
      setMessage("Кампания сохранена");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить");
    }
  }

  if (!form) return <div className="boot">Загрузка…</div>;

  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHead title="Кампания" text={form.isOpen ? "Приём заявок сейчас открыт." : "Приём заявок сейчас закрыт."} />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <div className="panel-block grid-form">
        <Field label="Название"><input className="span-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Приём с"><input type="date" value={dateInput(form.startsAt)} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required /></Field>
        <Field label="Приём по"><input type="date" value={dateInput(form.endsAt)} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} required /></Field>
        <Field label="Заселение с"><input type="date" value={dateInput(form.checkInFrom)} onChange={(event) => setForm({ ...form, checkInFrom: event.target.value })} required /></Field>
        <Field label="Заселение по"><input type="date" value={dateInput(form.checkInUntil)} onChange={(event) => setForm({ ...form, checkInUntil: event.target.value })} required /></Field>
        <label className="check"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Кампания активна</label>
      </div>
      <Button type="submit">Сохранить кампанию</Button>
    </form>
  );
}
