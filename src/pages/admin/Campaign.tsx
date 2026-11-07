import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { dateInput } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type Campaign = {
  name: string;
  checkInFrom: string;
  checkInUntil: string;
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
          checkInFrom: dateInput(form.checkInFrom),
          checkInUntil: dateInput(form.checkInUntil),
        }),
      });
      setForm(data.campaign);
      setMessage("Даты заселения сохранены");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить");
    }
  }

  if (!form) return <div className="boot">Загрузка…</div>;

  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHead title="Кампания" text="Эти даты печатаются в направлении на заселение." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <div className="panel-block grid-form">
        <Field label="Название"><input className="span-2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
        <Field label="Заселение с"><input type="date" value={dateInput(form.checkInFrom)} onChange={(event) => setForm({ ...form, checkInFrom: event.target.value })} required /></Field>
        <Field label="Заселение по"><input type="date" value={dateInput(form.checkInUntil)} onChange={(event) => setForm({ ...form, checkInUntil: event.target.value })} required /></Field>
      </div>
      <Button type="submit">Сохранить</Button>
    </form>
  );
}
