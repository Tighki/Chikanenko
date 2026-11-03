import { useEffect, useState } from "react";
import { api } from "../../api";
import { GENDER_LABELS, formatDateTime } from "../../labels";
import { Banner, Button, PageHead } from "../../components/ui";

type Row = {
  applicationId: string;
  fullName: string;
  faculty: string;
  gender: string;
  categoryTitle: string;
  score: number;
  outcome: "SETTLED" | "WAITLIST" | "SKIPPED";
  reason: string;
  buildingName?: string;
  roomNumber?: string;
  bedNumber?: number;
};

type Plan = { rows: Row[]; settledCount: number; waitlistCount: number; skippedCount: number; runId?: string };
type Run = { id: string; startedAt: string; groupByFaculty: boolean; summary: { settledCount: number; waitlistCount: number; skippedCount: number }; startedBy: { fullName: string } };

const outcomeText = { SETTLED: "Место", WAITLIST: "Очередь", SKIPPED: "Пропуск" };

export function SettlementPage() {
  const [groupByFaculty, setGroupByFaculty] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function loadRuns() {
    api<{ runs: Run[] }>("/api/settlement/runs").then((data) => setRuns(data.runs)).catch((reason) => setError(reason.message));
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function preview() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const next = await api<Plan>("/api/settlement/preview", { method: "POST", body: JSON.stringify({ groupByFaculty }) });
      setPlan(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось рассчитать");
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setPending(true);
    setError("");
    try {
      const next = await api<Plan>("/api/settlement/confirm", { method: "POST", body: JSON.stringify({ groupByFaculty }) });
      setPlan(next);
      setMessage(`Заселение записано: мест ${next.settledCount}, в очереди ${next.waitlistCount}.`);
      loadRuns();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось подтвердить");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <PageHead title="Автозаселение" text="Сначала смотрите проект распределения. Запись в базу происходит только после подтверждения." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <section className="grid-2">
        <article className="panel-block stack">
          <label className="check">
            <input type="checkbox" checked={groupByFaculty} onChange={(event) => { setGroupByFaculty(event.target.checked); setPlan(null); }} />
            Группировать по факультету
          </label>
          <div className="row">
            <Button onClick={preview} disabled={pending}>Рассчитать</Button>
            <Button variant="copper" onClick={confirm} disabled={pending || !plan}>Подтвердить распределение</Button>
          </div>
          <p className="muted">Подтверждение считает распределение заново по текущим данным и не трогает уже заселённых.</p>
        </article>
        <article className="panel-block">
          <h2>Правило</h2>
          <ol className="rules">
            <li>Сначала льгота, затем балл, затем более ранняя дата подачи.</li>
            <li>Комната того же пола, койка свободна, комната открыта.</li>
            <li>Инвалидность получает доступную среду в первую очередь.</li>
            <li>Остальные занимают обычные комнаты и берут доступную среду только если обычных мест нет.</li>
          </ol>
        </article>
      </section>
      {plan ? (
        <>
          <section className="cards">
            <article className="card stat"><span>Мест</span><b>{plan.settledCount}</b></article>
            <article className="card stat"><span>Очередь</span><b>{plan.waitlistCount}</b></article>
            <article className="card stat"><span>Пропуск</span><b>{plan.skippedCount}</b></article>
          </section>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Абитуриент</th><th>Льгота</th><th>Балл</th><th>Результат</th><th>Место</th></tr></thead>
              <tbody>
                {plan.rows.map((row) => (
                  <tr key={row.applicationId} className={`outcome-${row.outcome}`}>
                    <td>{row.fullName}<div className="muted">{row.faculty} · {GENDER_LABELS[row.gender]}</div></td>
                    <td>{row.categoryTitle}</td>
                    <td>{row.score}</td>
                    <td>{outcomeText[row.outcome]}<div className="muted">{row.reason}</div></td>
                    <td>{row.buildingName ? `${row.buildingName}, комн. ${row.roomNumber}, койка ${row.bedNumber}` : "нет"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      <section className="panel-block">
        <h2>Прошлые запуски</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Когда</th><th>Кто</th><th>Факультеты</th><th>Итог</th></tr></thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{formatDateTime(run.startedAt)}</td>
                  <td>{run.startedBy.fullName}</td>
                  <td>{run.groupByFaculty ? "Группировать" : "Без группировки"}</td>
                  <td>{run.summary.settledCount} мест, {run.summary.waitlistCount} в очереди, {run.summary.skippedCount} пропущено</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
