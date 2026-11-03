import { useEffect, useState, type FormEvent } from "react";
import { api, downloadFile } from "../../api";
import { DOCUMENT_LABELS, DOCUMENT_STATUS, STATUS_LABELS, formatDateTime } from "../../labels";
import { Badge, Banner, Button, Empty, Field, PageHead } from "../../components/ui";

type DocumentItem = {
  id: string;
  type: string;
  originalName: string;
  status: string;
  reviewComment: string | null;
  uploadedAt: string;
};

type HomeData = {
  application: null | {
    id: string;
    status: string;
    comment: string | null;
    staffComment: string | null;
    documents: DocumentItem[];
  };
  campaign: null | { isOpen: boolean; startsAt: string; endsAt: string };
  missingDocuments: string[];
  requiredGroups: { type: string; label: string }[][];
  problems: string[];
};

export function ApplicationPage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [comment, setComment] = useState("");
  const [type, setType] = useState("PASSPORT");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    api<HomeData>("/api/applicant/home")
      .then((next) => {
        setData(next);
        setComment(next.application?.comment ?? "");
      })
      .catch((reason) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, []);

  const status = data?.application?.status;
  const editable = !status || ["DRAFT", "SUBMITTED", "REJECTED", "CANCELLED"].includes(status);

  async function createApplication() {
    setError("");
    try {
      await api("/api/applicant/application", { method: "POST" });
      setMessage("Черновик создан");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось создать заявку");
    }
  }

  async function saveComment(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/applicant/application", { method: "PUT", body: JSON.stringify({ comment }) });
      setMessage("Комментарий сохранён");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить");
    }
  }

  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError("");
    const body = new FormData();
    body.set("type", type);
    body.set("file", file);
    try {
      await api("/api/applicant/documents", { method: "POST", body });
      setFile(null);
      setMessage("Документ загружен");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить файл");
    }
  }

  async function submit() {
    setError("");
    try {
      await api("/api/applicant/application/submit", { method: "POST" });
      setMessage("Заявка подана");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось подать заявку");
    }
  }

  async function cancel() {
    setError("");
    try {
      await api("/api/applicant/application/cancel", { method: "POST" });
      setMessage("Заявка отменена");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось отменить");
    }
  }

  return (
    <div className="stack">
      <PageHead
        title="Заявка на заселение"
        text={data?.campaign ? `Приём ${data.campaign.isOpen ? "открыт" : "закрыт"}.` : "Кампания не настроена."}
      />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      {!data?.application ? (
        <section className="panel-block stack">
          <p>Заявки ещё нет. Черновик можно создать, пока приём открыт.</p>
          <Button onClick={createApplication} disabled={!data?.campaign?.isOpen}>Создать заявку</Button>
        </section>
      ) : (
        <>
          <section className="cards">
            <article className="card stat"><span>Статус</span><b style={{ fontSize: "1.4rem" }}>{STATUS_LABELS[data.application.status]}</b></article>
            <article className="card"><span className="muted">Нужные документы</span><p>{data.requiredGroups.map((group) => group.map((item) => item.label).join(" или ")).join("; ")}</p></article>
          </section>
          {data.application.staffComment ? <Banner>{data.application.staffComment}</Banner> : null}
          {data.missingDocuments.length ? <Banner>Для допуска ещё нужны проверенные документы: {data.missingDocuments.join(", ")}</Banner> : null}
          <form className="panel-block stack" onSubmit={saveComment}>
            <Field label="Комментарий к заявке">
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} disabled={!editable} />
            </Field>
            <div className="row">
              <Button type="submit" variant="ghost" disabled={!editable}>Сохранить комментарий</Button>
              {["DRAFT", "REJECTED", "CANCELLED"].includes(data.application.status) ? (
                <Button type="button" onClick={submit}>Подать заявку</Button>
              ) : null}
              {!["SETTLED", "CANCELLED"].includes(data.application.status) ? (
                <Button type="button" variant="danger" onClick={cancel}>Отменить заявку</Button>
              ) : null}
            </div>
          </form>
          <form className="panel-block stack" onSubmit={upload}>
            <h2>Документы-основания</h2>
            <div className="grid-form">
              <Field label="Тип">
                <select value={type} onChange={(event) => setType(event.target.value)} disabled={!editable}>
                  {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Файл">
                <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} disabled={!editable} />
              </Field>
            </div>
            <Button type="submit" disabled={!editable || !file}>Загрузить</Button>
          </form>
          {data.application.documents.length === 0 ? <Empty>Документы ещё не приложены.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Документ</th><th>Файл</th><th>Статус</th><th>Загружен</th><th></th></tr>
                </thead>
                <tbody>
                  {data.application.documents.map((document) => (
                    <tr key={document.id}>
                      <td>{DOCUMENT_LABELS[document.type]}{document.reviewComment ? <div className="muted">{document.reviewComment}</div> : null}</td>
                      <td><button className="btn btn-ghost" onClick={() => downloadFile(`/api/documents/${document.id}/file`, document.originalName)}>{document.originalName}</button></td>
                      <td><Badge value={document.status} map={DOCUMENT_STATUS} /></td>
                      <td>{formatDateTime(document.uploadedAt)}</td>
                      <td>{editable && document.status !== "VERIFIED" ? <Button variant="danger" onClick={async () => { await api(`/api/applicant/documents/${document.id}`, { method: "DELETE" }); load(); }}>Удалить</Button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
