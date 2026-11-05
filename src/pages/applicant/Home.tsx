import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, downloadFile } from "../../api";
import { useAuth } from "../../auth";
import { CATEGORY_LABELS, GENDER_LABELS, STATUS_LABELS, formatDate } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type HomeData = {
  profile: {
    fullName: string;
    faculty: string;
    specialty: string;
    admissionScore: number;
    priorityCategory: string;
    city: string;
    gender: string | null;
  };
  application: null | {
    id: string;
    status: string;
    staffComment: string | null;
    settlement: null | {
      id: string;
      orderNumber: string;
      bed: { number: number; room: { number: string; accessible: boolean; building: { name: string; address: string } } };
      checkInFrom: string | null;
      checkInUntil: string | null;
    };
  };
  campaign: null | { name: string; startsAt: string; endsAt: string; isOpen: boolean };
  problems: string[];
};

export function ApplicantHome() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    api<HomeData>("/api/applicant/home").then(setData).catch((reason) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, []);

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/auth/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setMessage("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сменить пароль");
    }
  }

  const settlement = data?.application?.settlement;

  return (
    <div className="stack">
      <PageHead title={data?.profile.fullName || user?.fullName || "Кабинет"} text={data?.campaign?.name || "Заселение в общежитие"} />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      {user?.mustChangePassword ? (
        <form className="panel-block stack" onSubmit={changePassword}>
          <h2>Смените временный пароль</h2>
          <div className="grid-form">
            <Field label="Текущий пароль">
              <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
            </Field>
            <Field label="Новый пароль">
              <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} required />
            </Field>
          </div>
          <Button type="submit">Сохранить пароль</Button>
        </form>
      ) : null}
      <section className="cards">
        <article className="card stat">
          <span>Статус заявки</span>
          <b>{data?.application ? STATUS_LABELS[data.application.status] : "Нет заявки"}</b>
        </article>
        <article className="card stat">
          <span>Льгота</span>
          <b style={{ fontSize: "1.15rem" }}>{CATEGORY_LABELS[data?.profile.priorityCategory || "NONE"]}</b>
        </article>
        <article className="card stat">
          <span>Балл</span>
          <b>{data?.profile.admissionScore ?? "нет"}</b>
        </article>
        <article className="card stat">
          <span>Приём заявок</span>
          <b style={{ fontSize: "1.15rem" }}>{data?.campaign?.isOpen ? "Открыт" : "Закрыт"}</b>
        </article>
      </section>
      {settlement ? (
        <section className="panel-block stack">
          <h2>Место назначено</h2>
          <p>
            {settlement.bed.room.building.name}, комната {settlement.bed.room.number}, койка {settlement.bed.number}.
            Направление {settlement.orderNumber}.
          </p>
          <p className="muted">
            Заселение с {formatDate(settlement.checkInFrom)} по {formatDate(settlement.checkInUntil)}. {settlement.bed.room.building.address}
          </p>
          <Button onClick={() => downloadFile("/api/applicant/direction", `${settlement.orderNumber}.pdf`).catch((reason) => setError(reason.message))}>
            Скачать направление
          </Button>
        </section>
      ) : null}
      {data?.application?.staffComment ? <Banner>{data.application.staffComment}</Banner> : null}
      {data?.problems.length ? <Banner kind="error">Анкета не заполнена: {data.problems[0]}</Banner> : null}
      <div className="row">
        <Link to="/app/profile">Открыть анкету</Link>
        <Link to="/app/application">Открыть заявку</Link>
      </div>
      <p className="muted">{data?.profile.faculty} {data?.profile.specialty ? `· ${data.profile.specialty}` : ""} {data?.profile.gender ? `· ${GENDER_LABELS[data.profile.gender]}` : ""} {data?.profile.city ? `· ${data.profile.city}` : ""}</p>
    </div>
  );
}
