import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, downloadFile } from "../../api";
import { CATEGORY_LABELS, DOCUMENT_LABELS, DOCUMENT_STATUS, GENDER_LABELS, STATUS_LABELS, formatDate, formatDistance, formatHome } from "../../labels";
import { Badge, Banner, Button, Field, PageHead } from "../../components/ui";

type DocumentItem = {
  id: string;
  type: string;
  originalName: string;
  status: string;
  reviewComment: string | null;
};

type ReviewData = {
  application: {
    id: string;
    status: string;
    comment: string | null;
    staffComment: string | null;
    applicant: {
      lastName: string;
      firstName: string;
      middleName: string | null;
      birthDate: string | null;
      gender: string | null;
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
      user: { email: string; phone: string | null };
    };
    documents: DocumentItem[];
    settlement: { orderNumber: string } | null;
  };
  problems: string[];
  missingDocuments: string[];
  institute: { address: string };
};

export function ReviewPage() {
  const { id } = useParams();
  const [data, setData] = useState<ReviewData | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    api<ReviewData>(`/api/staff/applications/${id}`)
      .then((next) => {
        setData(next);
        setComment(next.application.staffComment ?? "");
      })
      .catch((reason) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status: "IN_REVIEW" | "APPROVED" | "REJECTED") {
    setError("");
    setMessage("");
    try {
      await api(`/api/staff/applications/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, staffComment: comment }),
      });
      setMessage("Статус обновлён");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось обновить статус");
    }
  }

  async function reviewDocument(documentId: string, status: string) {
    setError("");
    try {
      await api(`/api/staff/documents/${documentId}/review`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось проверить документ");
    }
  }

  if (!data) return <div className="boot">{error || "Загрузка…"}</div>;
  const person = data.application.applicant;
  const name = [person.lastName, person.firstName, person.middleName].filter(Boolean).join(" ");

  return (
    <div className="stack">
      <PageHead title={name} text={`${person.user.email} · ${person.user.phone || "телефон не указан"}`}>
        <Link to="/staff/applications">К списку</Link>
      </PageHead>
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <section className="grid-2">
        <article className="panel-block stack">
          <h2>Анкета</h2>
          <p>{GENDER_LABELS[person.gender || ""] || "Пол не указан"}, {formatDate(person.birthDate)}</p>
          <p>{formatHome(person)}</p>
          <p>До института ({data.institute.address}): {formatDistance(person.distanceKm)}</p>
          <p>{person.faculty}</p>
          <p>{person.specialty}</p>
          <p>Балл: {person.admissionScore}</p>
          <p>Льгота: {CATEGORY_LABELS[person.priorityCategory]}</p>
          <p>Статус: <Badge value={data.application.status} map={STATUS_LABELS} /></p>
          {data.application.comment ? <p className="muted">Комментарий абитуриента: {data.application.comment}</p> : null}
          {data.application.settlement ? <p>Направление {data.application.settlement.orderNumber}</p> : null}
        </article>
        <article className="panel-block stack">
          <h2>Решение</h2>
          {data.problems.map((problem) => <Banner key={problem} kind="error">{problem}</Banner>)}
          {data.missingDocuments.length ? <Banner>Не проверены: {data.missingDocuments.join(", ")}</Banner> : null}
          <Field label="Комментарий сотруднику, его увидит абитуриент">
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
          </Field>
          <div className="row">
            <Button variant="ghost" onClick={() => setStatus("IN_REVIEW")}>На проверку</Button>
            <Button onClick={() => setStatus("APPROVED")}>Допустить</Button>
            <Button variant="danger" onClick={() => setStatus("REJECTED")}>Отказать</Button>
          </div>
        </article>
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Документ</th><th>Файл</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {data.application.documents.map((document) => (
              <tr key={document.id}>
                <td>{DOCUMENT_LABELS[document.type]}</td>
                <td><button className="btn btn-ghost" onClick={() => downloadFile(`/api/documents/${document.id}/file`, document.originalName)}>{document.originalName}</button></td>
                <td><Badge value={document.status} map={DOCUMENT_STATUS} /></td>
                <td className="row">
                  <Button variant="ghost" onClick={() => reviewDocument(document.id, "VERIFIED")}>Принять</Button>
                  <Button variant="danger" onClick={() => reviewDocument(document.id, "REJECTED")}>Отклонить</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
