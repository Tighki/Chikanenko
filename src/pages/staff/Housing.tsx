import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { api } from "../../api";
import { Banner, Button, Field, PageHead } from "../../components/ui";

type Gender = "MALE" | "FEMALE";
type Occupant = { applicationId: string; name: string; gender: Gender | null };
type DraftBed = { key: string; id?: string; number: number; blocked: boolean; occupant: Occupant | null };
type DraftRoom = {
  key: string;
  id?: string;
  number: string;
  floor: number;
  gender: Gender;
  accessible: boolean;
  closed: boolean;
  beds: DraftBed[];
};
type Student = {
  applicationId: string;
  name: string;
  birthDate: string | null;
  faculty: string;
  city: string;
  gender: Gender | null;
  status: string;
  placeable: boolean;
  placeBlock: string | null;
};
type Workspace = {
  buildings: {
    id: string;
    name: string;
    address: string;
    rooms: {
      id: string;
      number: string;
      floor: number;
      gender: Gender;
      accessible: boolean;
      status: string;
      beds: { id: string; number: number; status: string; occupant: Occupant | null }[];
    }[];
  }[];
  students: Student[];
};

let draftKey = 0;
function nextKey() {
  draftKey += 1;
  return `draft-${draftKey}`;
}

function fullYears(value: string | null) {
  if (!value) return null;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function roomsFromApi(building: Workspace["buildings"][number]): DraftRoom[] {
  return building.rooms.map((room) => ({
    key: room.id,
    id: room.id,
    number: room.number,
    floor: room.floor,
    gender: room.gender,
    accessible: room.accessible,
    closed: room.status === "CLOSED",
    beds: room.beds.map((bed) => ({
      key: bed.id,
      id: bed.id,
      number: bed.number,
      blocked: bed.status === "BLOCKED",
      occupant: bed.occupant,
    })),
  }));
}

function makeRoom(floor: number, number: string, bedCount: number): DraftRoom {
  return {
    key: nextKey(),
    number,
    floor,
    gender: "MALE",
    accessible: false,
    closed: false,
    beds: Array.from({ length: bedCount }, (_, index) => ({
      key: nextKey(),
      number: index + 1,
      blocked: false,
      occupant: null,
    })),
  };
}

function nextRoomNumber(rooms: DraftRoom[]) {
  const max = rooms.reduce((highest, room) => {
    const value = Number(room.number);
    return Number.isInteger(value) ? Math.max(highest, value) : highest;
  }, 0);
  return String(max + 1);
}

function snapshot(rooms: DraftRoom[]) {
  return JSON.stringify(rooms.map((room) => ({
    id: room.id ?? null,
    number: room.number,
    floor: room.floor,
    gender: room.gender,
    accessible: room.accessible,
    closed: room.closed,
    beds: room.beds.map((bed) => ({
      id: bed.id ?? null,
      number: bed.number,
      blocked: bed.blocked,
      applicationId: bed.occupant?.applicationId ?? null,
    })),
  })));
}

export function HousingPage() {
  const [buildings, setBuildings] = useState<Workspace["buildings"]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [rooms, setRooms] = useState<DraftRoom[]>([]);
  const [saved, setSaved] = useState("");
  const [floor, setFloor] = useState(1);
  const [roomKey, setRoomKey] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [overBed, setOverBed] = useState("");
  const [buildingForm, setBuildingForm] = useState({ name: "Общежитие", address: "ул. Студенческая, 1", gender: "MALE" });

  function applyWorkspace(data: Workspace, preferredId = buildingId) {
    setBuildings(data.buildings);
    setStudents(data.students);
    const building = data.buildings.find((item) => item.id === preferredId) ?? data.buildings[0];
    if (!building) {
      setBuildingId("");
      setRooms([]);
      setSaved("");
      return;
    }
    const nextRooms = roomsFromApi(building);
    setBuildingId(building.id);
    setRooms(nextRooms);
    setSaved(snapshot(nextRooms));
    setFloor(nextRooms[0]?.floor ?? 1);
    setRoomKey(nextRooms[0]?.key ?? "");
  }

  function load(preferredId = buildingId) {
    api<Workspace>("/api/housing/workspace")
      .then((data) => applyWorkspace(data, preferredId))
      .catch((reason) => setError(reason.message));
  }

  useEffect(() => {
    load();
  }, []);

  const dirty = snapshot(rooms) !== saved;
  const floors = useMemo(() => {
    const maxFloor = rooms.reduce((max, room) => Math.max(max, room.floor), 1);
    return Array.from({ length: maxFloor }, (_, index) => index + 1);
  }, [rooms]);
  const floorRooms = rooms.filter((room) => room.floor === floor).sort((left, right) => left.number.localeCompare(right.number, "ru", { numeric: true }));
  const selectedRoom = rooms.find((room) => room.key === roomKey) ?? floorRooms[0];
  const placed = new Set(rooms.flatMap((room) => room.beds.flatMap((bed) => (bed.occupant ? [bed.occupant.applicationId] : []))));
  const visibleStudents = students.filter((student) => {
    const text = `${student.name} ${student.faculty} ${student.city}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  function replaceRoom(next: DraftRoom) {
    setRooms((current) => current.map((room) => (room.key === next.key ? next : room)));
  }

  function clearOccupant(applicationId: string, source = rooms) {
    return source.map((room) => ({
      ...room,
      beds: room.beds.map((bed) => (bed.occupant?.applicationId === applicationId ? { ...bed, occupant: null } : bed)),
    }));
  }

  function setFloorCount(count: number) {
    const next = Math.min(30, Math.max(1, count));
    const highest = floors[floors.length - 1] ?? 1;
    if (next < highest) {
      const doomed = rooms.filter((room) => room.floor > next && room.beds.some((bed) => bed.occupant));
      if (doomed.length > 0) {
        setError("На убираемых этажах есть студенты. Сначала снимите их с коек.");
        return;
      }
      setError("");
      const remaining = rooms.filter((room) => room.floor <= next);
      setRooms(remaining);
      setFloor(Math.min(floor, next));
      return;
    }
    if (next > highest) {
      let created = [...rooms];
      for (let level = highest + 1; level <= next; level += 1) {
        created = [...created, makeRoom(level, nextRoomNumber(created), 2)];
      }
      setRooms(created);
      setFloor(next);
      setRoomKey(created[created.length - 1]?.key ?? "");
    }
    setError("");
  }

  function setRoomCount(count: number) {
    const next = Math.min(40, Math.max(0, count));
    const current = floorRooms;
    if (next < current.length) {
      const removed = current.slice(next);
      if (removed.some((room) => room.beds.some((bed) => bed.occupant))) {
        setError("В убираемых комнатах есть студенты. Сначала снимите их с коек.");
        return;
      }
      const removedKeys = new Set(removed.map((room) => room.key));
      setRooms(rooms.filter((room) => !removedKeys.has(room.key)));
      setRoomKey(current[Math.max(0, next - 1)]?.key ?? "");
      setError("");
      return;
    }
    let created = [...rooms];
    for (let index = current.length; index < next; index += 1) {
      created = [...created, makeRoom(floor, nextRoomNumber(created), selectedRoom?.beds.length || 2)];
    }
    setRooms(created);
    setRoomKey(created[created.length - 1]?.key ?? roomKey);
    setError("");
  }

  function setBedCount(count: number) {
    if (!selectedRoom) return;
    const next = Math.min(8, Math.max(1, count));
    if (next < selectedRoom.beds.length) {
      const removed = selectedRoom.beds.slice(next);
      if (removed.some((bed) => bed.occupant)) {
        setError("На убираемых койках есть студенты. Сначала перетащите их обратно в список.");
        return;
      }
    }
    const beds = Array.from({ length: next }, (_, index) => selectedRoom.beds[index] ?? {
      key: nextKey(),
      number: index + 1,
      blocked: false,
      occupant: null,
    });
    replaceRoom({ ...selectedRoom, beds: beds.map((bed, index) => ({ ...bed, number: index + 1 })) });
    setError("");
  }

  function placeStudent(applicationId: string, targetRoom: DraftRoom, bedKey: string) {
    const student = students.find((item) => item.applicationId === applicationId);
    const known = rooms.some((room) => room.beds.some((bed) => bed.occupant?.applicationId === applicationId));
    if (!student || (!student.placeable && !known)) {
      setError(student?.placeBlock || "Этого студента пока нельзя селить");
      return;
    }
    if (student.gender && student.gender !== targetRoom.gender) {
      setError(`${student.name} не подходит в эту комнату: другой пол`);
      return;
    }
    if (targetRoom.closed) {
      setError("Комната закрыта");
      return;
    }
    const bed = targetRoom.beds.find((item) => item.key === bedKey);
    if (!bed || bed.blocked) {
      setError("Койка недоступна");
      return;
    }
    const occupant = { applicationId, name: student.name, gender: student.gender };
    const cleared = clearOccupant(applicationId);
    setRooms(cleared.map((room) => room.key !== targetRoom.key ? room : {
      ...room,
      beds: room.beds.map((item) => {
        if (item.key !== bedKey) return item;
        return { ...item, occupant };
      }),
    }));
    setError("");
  }

  function releaseStudent(applicationId: string) {
    setRooms(clearOccupant(applicationId));
    setError("");
  }

  async function save() {
    if (!buildingId) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await api("/api/housing/layout", {
        method: "POST",
        body: JSON.stringify({
          buildingId,
          rooms: rooms.map((room) => ({
            id: room.id,
            number: room.number,
            floor: room.floor,
            gender: room.gender,
            accessible: room.accessible,
            closed: room.closed,
            beds: room.beds.map((bed) => ({
              id: bed.id,
              number: bed.number,
              blocked: bed.blocked,
              applicationId: bed.occupant?.applicationId ?? null,
            })),
          })),
        }),
      });
      setMessage("Жилой фонд сохранён");
      load(buildingId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить");
    } finally {
      setPending(false);
    }
  }

  async function createBuilding(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/housing/buildings", { method: "POST", body: JSON.stringify(buildingForm) });
      setMessage("Корпус добавлен");
      load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось добавить корпус");
    }
  }

  function onDragStart(event: DragEvent, applicationId: string) {
    event.dataTransfer.setData("text/plain", applicationId);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="stack">
      <PageHead title="Жилой фонд" text="Слева этажи, комнаты и койки. Справа студенты: перетащите строку на свободную койку. Изменения записываются по кнопке «Сохранить».">
        <Button onClick={save} disabled={!dirty || pending || !buildingId}>{pending ? "Сохраняем…" : "Сохранить"}</Button>
      </PageHead>
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      {buildings.length === 0 ? (
        <form className="panel-block stack" onSubmit={createBuilding}>
          <h2>Новый корпус</h2>
          <Field label="Название"><input value={buildingForm.name} onChange={(event) => setBuildingForm({ ...buildingForm, name: event.target.value })} required /></Field>
          <Field label="Адрес"><input value={buildingForm.address} onChange={(event) => setBuildingForm({ ...buildingForm, address: event.target.value })} required /></Field>
          <Button type="submit">Создать</Button>
        </form>
      ) : (
        <>
          <div className="fund-toolbar">
            {buildings.length > 1 ? (
              <Field label="Корпус">
                <select value={buildingId} onChange={(event) => {
                  const id = event.target.value;
                  const building = buildings.find((item) => item.id === id);
                  if (!building) return;
                  const nextRooms = roomsFromApi(building);
                  setBuildingId(id);
                  setRooms(nextRooms);
                  setSaved(snapshot(nextRooms));
                  setFloor(nextRooms[0]?.floor ?? 1);
                  setRoomKey(nextRooms[0]?.key ?? "");
                }}>
                  {buildings.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </Field>
            ) : <strong>{buildings[0]?.name}</strong>}
            <label className="stepper">Этажей
              <input type="number" min={1} max={30} value={floors[floors.length - 1] ?? 1} onChange={(event) => setFloorCount(Number(event.target.value))} />
            </label>
            <label className="stepper">Комнат на этаже
              <input type="number" min={0} max={40} value={floorRooms.length} onChange={(event) => setRoomCount(Number(event.target.value))} />
            </label>
            <label className="stepper">Коек в комнате
              <input type="number" min={1} max={8} value={selectedRoom?.beds.length ?? 1} disabled={!selectedRoom} onChange={(event) => setBedCount(Number(event.target.value))} />
            </label>
            <label className="stepper">Пол комнаты
              <select
                value={selectedRoom?.gender ?? "MALE"}
                disabled={!selectedRoom}
                onChange={(event) => {
                  if (!selectedRoom) return;
                  const gender = event.target.value as Gender;
                  const mismatched = selectedRoom.beds.filter((bed) => bed.occupant?.gender && bed.occupant.gender !== gender);
                  replaceRoom({
                    ...selectedRoom,
                    gender,
                    beds: selectedRoom.beds.map((bed) => (bed.occupant?.gender && bed.occupant.gender !== gender ? { ...bed, occupant: null } : bed)),
                  });
                  if (mismatched.length > 0) setMessage("Студенты другого пола сняты с коек этой комнаты. Сохраните, чтобы записать.");
                }}
              >
                <option value="MALE">Мужской</option>
                <option value="FEMALE">Женский</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={selectedRoom?.accessible ?? false}
                disabled={!selectedRoom}
                onChange={(event) => selectedRoom && replaceRoom({ ...selectedRoom, accessible: event.target.checked })}
              />
              Доступная среда
            </label>
          </div>
          <div className="fund-layout">
            <div className="fund-board">
              <section className="fund-col">
                <h3>Этажи</h3>
                <div className="fund-list">
                  {floors.map((level) => (
                    <button key={level} type="button" className={`fund-item ${level === floor ? "active" : ""}`} onClick={() => { setFloor(level); const first = rooms.find((room) => room.floor === level); setRoomKey(first?.key ?? ""); }}>
                      <b>{level}</b>
                      <span>{rooms.filter((room) => room.floor === level).length} комн.</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="fund-col">
                <h3>Комнаты</h3>
                <div className="fund-list">
                  {floorRooms.length === 0 ? <p className="fund-empty">На этаже нет комнат</p> : floorRooms.map((room) => (
                    <button key={room.key} type="button" className={`fund-item ${room.key === selectedRoom?.key ? "active" : ""}`} onClick={() => setRoomKey(room.key)}>
                      <b>{room.number}</b>
                      <span>{room.gender === "MALE" ? "муж." : "жен."} · {room.beds.length} коек{room.accessible ? " · доступ" : ""}{room.closed ? " · закрыта" : ""}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="fund-col">
                <h3>Койки</h3>
                <div className="fund-list">
                  {selectedRoom ? selectedRoom.beds.map((bed) => (
                    <div
                      key={bed.key}
                      className={`bed-drop ${bed.occupant ? "taken" : ""} ${bed.blocked ? "blocked" : ""} ${overBed === bed.key ? "over" : ""}`}
                      onDragOver={(event) => { event.preventDefault(); setOverBed(bed.key); }}
                      onDragLeave={() => setOverBed((current) => (current === bed.key ? "" : current))}
                      onDrop={(event) => {
                        event.preventDefault();
                        setOverBed("");
                        placeStudent(event.dataTransfer.getData("text/plain"), selectedRoom, bed.key);
                      }}
                    >
                      <div className="spread">
                        <b>Койка {bed.number}</b>
                        {!bed.occupant ? (
                          <button type="button" className="linkish" onClick={() => replaceRoom({ ...selectedRoom, beds: selectedRoom.beds.map((item) => item.key === bed.key ? { ...item, blocked: !item.blocked } : item) })}>
                            {bed.blocked ? "Разблокировать" : "Блок"}
                          </button>
                        ) : null}
                      </div>
                      {bed.occupant ? (
                        <span
                          className="bed-person"
                          draggable
                          onDragStart={(event) => onDragStart(event, bed.occupant!.applicationId)}
                        >
                          {bed.occupant.name}
                          <button type="button" className="linkish" onClick={() => releaseStudent(bed.occupant!.applicationId)}>снять</button>
                        </span>
                      ) : <span className="muted">{bed.blocked ? "заблокирована" : "свободна, перетащите студента"}</span>}
                    </div>
                  )) : <p className="fund-empty">Выберите комнату</p>}
                </div>
              </section>
            </div>
            <section
              className="fund-students"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                releaseStudent(event.dataTransfer.getData("text/plain"));
              }}
            >
              <header className="fund-students-head">
                <h3>Студенты</h3>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" />
              </header>
              <div className="table-wrap fund-table">
                <table>
                  <thead>
                    <tr><th>ФИО</th><th>Возраст</th><th>Факультет</th><th>Город</th></tr>
                  </thead>
                  <tbody>
                    {visibleStudents.map((student) => {
                      const age = fullYears(student.birthDate);
                      const here = placed.has(student.applicationId);
                      const canDrag = student.placeable || here;
                      const dragProps = canDrag
                        ? { draggable: true, onDragStart: (event: DragEvent) => onDragStart(event, student.applicationId) }
                        : {};
                      return (
                        <tr
                          key={student.applicationId}
                          className={here ? "student-placed" : undefined}
                          title={student.placeBlock ?? (here ? "Уже на койке, можно перетащить на другую" : "Перетащите на койку")}
                        >
                          <td {...dragProps}>{student.name}</td>
                          <td {...dragProps}>{age == null ? "—" : age}</td>
                          <td {...dragProps}>{student.faculty || "—"}</td>
                          <td {...dragProps}>{student.city || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
