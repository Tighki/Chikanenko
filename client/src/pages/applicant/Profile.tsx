import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { CATEGORY_LABELS, dateInput, formatDistance } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type Profile = {
  lastName: string;
  firstName: string;
  middleName: string | null;
  birthDate: string | null;
  gender: "MALE" | "FEMALE" | null;
  city: string;
  region: string;
  street: string;
  house: string;
  apartment: string;
  distanceKm: number | null;
  faculty: string;
  specialty: string;
  admissionScore: number;
  priorityCategory: string;
  phone: string | null;
};

const empty: Profile = {
  lastName: "",
  firstName: "",
  middleName: "",
  birthDate: "",
  gender: "MALE",
  city: "",
  region: "",
  street: "",
  house: "",
  apartment: "",
  distanceKm: null,
  faculty: "",
  specialty: "",
  admissionScore: 0,
  priorityCategory: "OUT_OF_TOWN",
  phone: "",
};

export function ProfilePage() {
  const [form, setForm] = useState<Profile>(empty);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ profile: Profile; profileLocked: boolean }>("/api/applicant/home")
      .then((data) => {
        setLocked(data.profileLocked);
        setForm({
          ...data.profile,
          middleName: data.profile.middleName ?? "",
          birthDate: dateInput(data.profile.birthDate),
          gender: data.profile.gender ?? "MALE",
          phone: data.profile.phone ?? "",
          street: data.profile.street ?? "",
          house: data.profile.house ?? "",
          apartment: data.profile.apartment ?? "",
          distanceKm: data.profile.distanceKm ?? null,
        });
      })
      .catch((reason) => setError(reason.message));
  }, []);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const saved = await api<{ profile: { distanceKm: number | null } }>("/api/applicant/profile", { method: "PUT", body: JSON.stringify(form) });
      setForm((current) => ({ ...current, distanceKm: saved.profile.distanceKm }));
      setMessage("Анкета сохранена");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить");
    }
  }

  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHead title="Анкета" text="Эти сведения участвуют в сортировке: льгота, балл и дата подачи заявки." />
      {locked ? <Banner>Анкета закрыта для правок, пока заявка проверяется или место уже назначено.</Banner> : null}
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <div className="panel-block grid-form">
        <Field label="Фамилия"><input value={form.lastName} onChange={(event) => set("lastName", event.target.value)} disabled={locked} required /></Field>
        <Field label="Имя"><input value={form.firstName} onChange={(event) => set("firstName", event.target.value)} disabled={locked} required /></Field>
        <Field label="Отчество"><input value={form.middleName ?? ""} onChange={(event) => set("middleName", event.target.value)} disabled={locked} /></Field>
        <Field label="Дата рождения"><input type="date" value={form.birthDate ?? ""} onChange={(event) => set("birthDate", event.target.value)} disabled={locked} required /></Field>
        <Field label="Пол">
          <select value={form.gender ?? "MALE"} onChange={(event) => set("gender", event.target.value as Profile["gender"])} disabled={locked}>
            <option value="MALE">Мужской</option>
            <option value="FEMALE">Женский</option>
          </select>
        </Field>
        <Field label="Телефон"><input value={form.phone ?? ""} onChange={(event) => set("phone", event.target.value)} disabled={locked} /></Field>
        <Field label="Город"><input value={form.city} onChange={(event) => set("city", event.target.value)} disabled={locked} required /></Field>
        <Field label="Регион"><input value={form.region} onChange={(event) => set("region", event.target.value)} disabled={locked} required /></Field>
        <Field label="Улица"><input value={form.street} onChange={(event) => set("street", event.target.value)} disabled={locked} /></Field>
        <Field label="Дом"><input value={form.house} onChange={(event) => set("house", event.target.value)} disabled={locked} /></Field>
        <Field label="Квартира"><input value={form.apartment} onChange={(event) => set("apartment", event.target.value)} disabled={locked} /></Field>
        <p className="muted span-2">Расстояние по прямой до института (Москва, ул. Студенческая, 1): {formatDistance(form.distanceKm)}. Пересчитывается при сохранении города.</p>
        <Field label="Факультет или институт"><input value={form.faculty} onChange={(event) => set("faculty", event.target.value)} disabled={locked} required /></Field>
        <Field label="Направление"><input value={form.specialty} onChange={(event) => set("specialty", event.target.value)} disabled={locked} required /></Field>
        <Field label="Вступительный балл"><input type="number" min={0} max={400} value={form.admissionScore} onChange={(event) => set("admissionScore", Number(event.target.value))} disabled={locked} required /></Field>
        <Field label="Льготная категория">
          <select value={form.priorityCategory} onChange={(event) => set("priorityCategory", event.target.value)} disabled={locked}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Button type="submit" disabled={locked}>Сохранить анкету</Button>
    </form>
  );
}
