import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { CATEGORY_LABELS, GENDER_LABELS, STATUS_LABELS, formatDateTime } from "../../labels";
import { Badge, Field, PageHead } from "../../components/ui";

type Row = {
  id: string;
  status: string;
  submittedAt: string | null;
  name: string;
  email: string;
  faculty: string;
  score: number;
  category: string;
  gender: string | null;
};

export function ApplicationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    api<{ applications: Row[] }>(`/api/staff/applications?${params.toString()}`).then((data) => setRows(data.applications));
  }, [status, q]);

  return (
    <div className="stack">
      <PageHead title="Заявки" text="Проверка документов, допуск к распределению или отказ с причиной." />
      <div className="grid-form">
        <Field label="Статус">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Все</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Поиск">
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Фамилия, факультет или почта" />
        </Field>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Абитуриент</th><th>Пол</th><th>Факультет</th><th>Балл</th><th>Льгота</th><th>Статус</th><th>Подана</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link to={`/staff/applications/${row.id}`}>{row.name}</Link><div className="muted">{row.email}</div></td>
                <td>{row.gender ? GENDER_LABELS[row.gender] : "нет"}</td>
                <td>{row.faculty}</td>
                <td>{row.score}</td>
                <td>{CATEGORY_LABELS[row.category]}</td>
                <td><Badge value={row.status} map={STATUS_LABELS} /></td>
                <td>{formatDateTime(row.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
