import { useEffect, useState, type FormEvent } from "react";
import { api } from "../../api";
import { GENDER_LABELS } from "../../labels";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type Bed = { id: string; number: number; status: string };
type Room = { id: string; number: string; floor: number; accessible: boolean; status: string; beds: Bed[] };
type Building = { id: string; name: string; address: string; gender: "MALE" | "FEMALE"; rooms: Room[] };

export function HousingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [building, setBuilding] = useState({ name: "", address: "", gender: "MALE" });
  const [room, setRoom] = useState({ buildingId: "", number: "", floor: 1, accessible: false, bedCount: 2 });

  function load() {
    api<{ buildings: Building[] }>("/api/housing").then((data) => {
      setBuildings(data.buildings);
      setRoom((current) => ({ ...current, buildingId: current.buildingId || data.buildings[0]?.id || "" }));
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function createBuilding(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/housing/buildings", { method: "POST", body: JSON.stringify(building) });
      setBuilding({ name: "", address: "", gender: "MALE" });
      setMessage("Корпус добавлен");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить корпус");
    }
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/housing/rooms", { method: "POST", body: JSON.stringify({ ...room, floor: Number(room.floor), bedCount: Number(room.bedCount) }) });
      setMessage("Комната добавлена");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить комнату");
    }
  }

  async function roomStatus(id: string, status: string) {
    setError("");
    try {
      await api(`/api/housing/rooms/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить комнату");
    }
  }

  async function bedStatus(id: string, status: string) {
    setError("");
    try {
      await api(`/api/housing/beds/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось изменить койку");
    }
  }

  return (
    <div className="stack">
      <PageHead title="Жилой фонд" text="Корпуса разделены по полу. Доступная среда резервируется для абитуриентов с инвалидностью." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <div className="grid-2">
        <form className="panel-block stack" onSubmit={createBuilding}>
          <h2>Новый корпус</h2>
          <Field label="Название"><input value={building.name} onChange={(event) => setBuilding({ ...building, name: event.target.value })} required /></Field>
          <Field label="Адрес"><input value={building.address} onChange={(event) => setBuilding({ ...building, address: event.target.value })} required /></Field>
          <Field label="Пол">
            <select value={building.gender} onChange={(event) => setBuilding({ ...building, gender: event.target.value })}>
              <option value="MALE">Мужской</option>
              <option value="FEMALE">Женский</option>
            </select>
          </Field>
          <Button type="submit">Добавить корпус</Button>
        </form>
        <form className="panel-block stack" onSubmit={createRoom}>
          <h2>Новая комната</h2>
          <Field label="Корпус">
            <select value={room.buildingId} onChange={(event) => setRoom({ ...room, buildingId: event.target.value })}>
              {buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <div className="grid-form">
            <Field label="Номер"><input value={room.number} onChange={(event) => setRoom({ ...room, number: event.target.value })} required /></Field>
            <Field label="Этаж"><input type="number" min={1} value={room.floor} onChange={(event) => setRoom({ ...room, floor: Number(event.target.value) })} /></Field>
            <Field label="Коек"><input type="number" min={1} max={8} value={room.bedCount} onChange={(event) => setRoom({ ...room, bedCount: Number(event.target.value) })} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={room.accessible} onChange={(event) => setRoom({ ...room, accessible: event.target.checked })} /> Комната доступной среды</label>
          <Button type="submit">Добавить комнату</Button>
        </form>
      </div>
      {buildings.map((item) => (
        <section key={item.id} className="panel-block stack">
          <div className="spread">
            <h2>{item.name}</h2>
            <span className="muted">{GENDER_LABELS[item.gender]} · {item.address}</span>
          </div>
          {item.rooms.map((current) => (
            <div key={current.id} className="stack">
              <div className="spread">
                <strong>Комната {current.number}, этаж {current.floor}{current.accessible ? " · доступная среда" : ""}{current.status === "CLOSED" ? " · закрыта" : ""}</strong>
                <Button variant="ghost" onClick={() => roomStatus(current.id, current.status === "ACTIVE" ? "CLOSED" : "ACTIVE")}>
                  {current.status === "ACTIVE" ? "Закрыть" : "Открыть"}
                </Button>
              </div>
              <div className="beds">
                {current.beds.map((bed) => (
                  <button key={bed.id} className={`bed ${bed.status}`} onClick={() => bed.status !== "OCCUPIED" && bedStatus(bed.id, bed.status === "FREE" ? "BLOCKED" : "FREE")}>
                    Койка {bed.number}<br />{bed.status === "FREE" ? "свободна" : bed.status === "OCCUPIED" ? "занята" : "блок"}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
