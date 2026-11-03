import { useEffect, useState } from "react";
import { api } from "../../api";
import { formatDateTime } from "../../labels";
import { PageHead } from "../../components/ui";

type Log = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  details: unknown;
  user: { fullName: string; email: string } | null;
};

export function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    api<{ logs: Log[] }>("/api/admin/audit").then((data) => setLogs(data.logs));
  }, []);

  return (
    <div className="stack">
      <PageHead title="Журнал действий" text="Регистрация, проверка заявок, импорт, автозаселение и ручные назначения." />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Объект</th><th>Детали</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDateTime(log.createdAt)}</td>
                <td>{log.user?.fullName || "Система"}</td>
                <td>{log.action}</td>
                <td>{log.entity}</td>
                <td className="muted">{log.details ? JSON.stringify(log.details) : "нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
