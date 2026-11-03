import { useEffect, useState } from "react";
import { api, downloadFile } from "../../api";
import { GENDER_LABELS, formatDate } from "../../labels";
import { Banner, Button, Empty, PageHead } from "../../components/ui";

type Row = {
  id: string;
  orderNumber: string;
  method: string;
  name: string;
  faculty: string;
  categoryTitle: string;
  gender: string | null;
  building: string;
  room: string;
  bed: number;
  checkInFrom: string | null;
};

export function ReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ settlements: Row[] }>("/api/settlement/report").then((data) => setRows(data.settlements)).catch((reason) => setError(reason.message));
  }, []);

  return (
    <div className="stack">
      <PageHead title="Список заселённых" text="Направление можно скачать отдельно по каждому абитуриенту." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {rows.length === 0 ? <Empty>После подтверждения автозаселения здесь появится список.</Empty> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Направление</th><th>Абитуриент</th><th>Льгота</th><th>Место</th><th>Заселение</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.orderNumber}<div className="muted">{row.method === "AUTO" ? "Авто" : "Вручную"}</div></td>
                  <td>{row.name}<div className="muted">{row.faculty} · {row.gender ? GENDER_LABELS[row.gender] : ""}</div></td>
                  <td>{row.categoryTitle}</td>
                  <td>{row.building}, комн. {row.room}, койка {row.bed}</td>
                  <td>{formatDate(row.checkInFrom)}</td>
                  <td><Button variant="ghost" onClick={() => downloadFile(`/api/settlement/${row.id}/pdf`, `${row.orderNumber}.pdf`)}>PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
