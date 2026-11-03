import { useEffect, useState } from "react";
import { api } from "../../api";
import { CATEGORY_LABELS, GENDER_LABELS } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type Waiting = { id: string; status: string; name: string; gender: string | null; faculty: string; category: string; score: number };
type Settled = { id: string; settlementId: string; name: string; gender: string | null; faculty: string; orderNumber: string; method: string; building: string; room: string; bed: number };
type Bed = { id: string; number: number; roomNumber: string; gender: string; accessible: boolean; building: string };

export function AssignmentsPage() {
  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const [settled, setSettled] = useState<Settled[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [settlementId, setSettlementId] = useState("");
  const [bedId, setBedId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    Promise.all([
      api<{ waiting: Waiting[]; settled: Settled[] }>("/api/settlement/board"),
      api<{ beds: Bed[] }>("/api/housing/free-beds"),
    ]).then(([board, free]) => {
      setWaiting(board.waiting);
      setSettled(board.settled);
      setBeds(free.beds);
    }).catch((reason) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, []);

  const selected = waiting.find((item) => item.id === applicationId);
  const moving = settled.find((item) => item.settlementId === settlementId);
  const gender = selected?.gender || moving?.gender;
  const suitable = beds.filter((bed) => !gender || bed.gender === gender);

  async function assign() {
    setError("");
    try {
      await api("/api/settlement/assign", { method: "POST", body: JSON.stringify({ applicationId, bedId }) });
      setMessage("Место назначено");
      setBedId("");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось назначить");
    }
  }

  async function move() {
    setError("");
    try {
      await api("/api/settlement/move", { method: "POST", body: JSON.stringify({ settlementId, bedId }) });
      setMessage("Абитуриент переселён");
      setBedId("");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось переселить");
    }
  }

  async function unassign(id: string) {
    setError("");
    try {
      await api("/api/settlement/unassign", { method: "POST", body: JSON.stringify({ settlementId: id }) });
      setMessage("Назначение снято");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось снять назначение");
    }
  }

  return (
    <div className="stack">
      <PageHead title="Назначения" text="Ручное место, переселение и снятие с койки. Пол комнаты сверяется с анкетой." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <section className="panel-block grid-form">
        <Field label="Без места">
          <select value={applicationId} onChange={(event) => { setApplicationId(event.target.value); setSettlementId(""); }}>
            <option value="">Выберите</option>
            {waiting.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.score}</option>)}
          </select>
        </Field>
        <Field label="Уже заселён, для переселения">
          <select value={settlementId} onChange={(event) => { setSettlementId(event.target.value); setApplicationId(""); }}>
            <option value="">Выберите</option>
            {settled.map((item) => <option key={item.settlementId} value={item.settlementId}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Свободная койка">
          <select value={bedId} onChange={(event) => setBedId(event.target.value)}>
            <option value="">Выберите</option>
            {suitable.map((bed) => (
              <option key={bed.id} value={bed.id}>
                {bed.building}, комн. {bed.roomNumber}, койка {bed.number}, {GENDER_LABELS[bed.gender]}{bed.accessible ? ", доступная среда" : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="row">
          <Button onClick={assign} disabled={!applicationId || !bedId}>Назначить</Button>
          <Button variant="copper" onClick={move} disabled={!settlementId || !bedId}>Переселить</Button>
        </div>
      </section>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ожидают</th><th>Пол</th><th>Факультет</th><th>Льгота</th><th>Балл</th></tr></thead>
          <tbody>
            {waiting.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.gender ? GENDER_LABELS[item.gender] : "нет"}</td>
                <td>{item.faculty}</td>
                <td>{CATEGORY_LABELS[item.category]}</td>
                <td>{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Заселены</th><th>Направление</th><th>Место</th><th>Способ</th><th></th></tr></thead>
          <tbody>
            {settled.map((item) => (
              <tr key={item.settlementId}>
                <td>{item.name}<div className="muted">{item.faculty}</div></td>
                <td>{item.orderNumber}</td>
                <td>{item.building}, комн. {item.room}, койка {item.bed}</td>
                <td>{item.method === "AUTO" ? "Авто" : "Вручную"}</td>
                <td><Button variant="danger" onClick={() => unassign(item.settlementId)}>Снять</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
