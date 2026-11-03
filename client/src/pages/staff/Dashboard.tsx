import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { CATEGORY_LABELS, STATUS_LABELS, formatDateTime } from "../../labels";
import { PageHead } from "../../components/ui";

type Dashboard = {
  applications: Record<string, number>;
  beds: Record<string, number>;
  rooms: number;
  buildings: number;
  recent: { id: string; status: string; submittedAt: string | null; name: string; faculty: string; category: string }[];
};

export function StaffHome() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    api<Dashboard>("/api/staff/dashboard").then(setData);
  }, []);

  const applications = data?.applications ?? {};
  const beds = data?.beds ?? {};

  return (
    <div className="stack">
      <PageHead title="Сводка" text="Свободные места, очередь заявок и то, что ждёт проверки." />
      <section className="cards">
        <article className="card stat"><span>Свободные койки</span><b>{beds.FREE ?? 0}</b></article>
        <article className="card stat"><span>Занятые койки</span><b>{beds.OCCUPIED ?? 0}</b></article>
        <article className="card stat"><span>Корпуса / комнаты</span><b>{data?.buildings ?? 0} / {data?.rooms ?? 0}</b></article>
        <article className="card stat"><span>Допущены</span><b>{applications.APPROVED ?? 0}</b></article>
      </section>
      <section className="cards">
        {["SUBMITTED", "IN_REVIEW", "WAITLIST", "SETTLED"].map((status) => (
          <article key={status} className="card stat">
            <span>{STATUS_LABELS[status]}</span>
            <b>{applications[status] ?? 0}</b>
          </article>
        ))}
      </section>
      <section className="panel-block">
        <h2>Ждут проверки</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Абитуриент</th><th>Факультет</th><th>Льгота</th><th>Подана</th></tr></thead>
            <tbody>
              {(data?.recent ?? []).map((item) => (
                <tr key={item.id}>
                  <td><Link to={`/staff/applications/${item.id}`}>{item.name}</Link></td>
                  <td>{item.faculty}</td>
                  <td>{CATEGORY_LABELS[item.category]}</td>
                  <td>{formatDateTime(item.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
