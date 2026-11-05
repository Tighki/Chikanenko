import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDateTime } from "../labels";
import { Button, Empty, PageHead } from "../components/ui";

type Item = { id: string; title: string; body: string; read: boolean; createdAt: string };

export function NotificationsPage() {
  const [items, setItems] = useState<Item[]>([]);

  function load() {
    api<{ items: Item[] }>("/api/notifications").then((data) => setItems(data.items));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <PageHead title="Уведомления">
        <Button variant="ghost" onClick={async () => { await api("/api/notifications/read-all", { method: "POST" }); load(); }}>Прочитать все</Button>
      </PageHead>
      {items.length === 0 ? <Empty>Уведомлений пока нет.</Empty> : items.map((item) => (
        <article key={item.id} className="panel-block stack">
          <div className="spread">
            <h2>{item.title}</h2>
            <span className="muted">{formatDateTime(item.createdAt)}</span>
          </div>
          <p>{item.body}</p>
          {!item.read ? <Button variant="ghost" onClick={async () => { await api(`/api/notifications/${item.id}/read`, { method: "POST" }); load(); }}>Отметить прочитанным</Button> : <span className="muted">Прочитано</span>}
        </article>
      ))}
    </div>
  );
}
