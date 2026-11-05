import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api } from "../../api";
import { Banner, Button, Field, PageHead } from "../../components/ui";
import { usePointerBedDrag } from "./usePointerBedDrag";

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

const ADMITTED_STATUSES = new Set(["APPROVED", "WAITLIST", "SETTLED"]);

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

function makeRoom(floor: number, number: string, bedCount: number, gender: Gender = "MALE"): DraftRoom {
  return {
    key: nextKey(),
    number,
    floor,
    gender,
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

function roomStats(room: DraftRoom) {
  const free = room.beds.filter((bed) => !bed.occupant && !bed.blocked).length;
  const taken = room.beds.filter((bed) => bed.occupant).length;
  return { beds: room.beds.length, free, taken };
}

function floorStats(rooms: DraftRoom[], level: number) {
  const onFloor = rooms.filter((room) => room.floor === level);
  const beds = onFloor.reduce((sum, room) => sum + room.beds.length, 0);
  const taken = onFloor.reduce((sum, room) => sum + room.beds.filter((bed) => bed.occupant).length, 0);
  return { rooms: onFloor.length, beds, free: beds - taken };
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
  const [buildingForm, setBuildingForm] = useState({ name: "Общежитие", address: "ул. Студенческая, 1", gender: "MALE" });
  const selectedRoomRef = useRef<DraftRoom | null>(null);

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
    const firstFloor = nextRooms.length ? Math.min(...nextRooms.map((room) => room.floor)) : 1;
    setFloor(firstFloor);
    setRoomKey(nextRooms.find((room) => room.floor === firstFloor)?.key ?? nextRooms[0]?.key ?? "");
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
    if (rooms.length === 0) return [1];
    return [...new Set(rooms.map((room) => room.floor))].sort((left, right) => left - right);
  }, [rooms]);
  const floorRooms = rooms
    .filter((room) => room.floor === floor)
    .sort((left, right) => left.number.localeCompare(right.number, "ru", { numeric: true }));
  const selectedRoom = roomKey ? rooms.find((room) => room.key === roomKey) ?? null : null;
  selectedRoomRef.current = selectedRoom;
  const placed = new Set(rooms.flatMap((room) => room.beds.flatMap((bed) => (bed.occupant ? [bed.occupant.applicationId] : []))));
  const visibleStudents = useMemo(() => {
    if (!selectedRoom) return [];
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const inThisRoom = selectedRoom.beds.some((bed) => bed.occupant?.applicationId === student.applicationId);
      if (!ADMITTED_STATUSES.has(student.status) && !inThisRoom) return false;
      if (student.gender !== selectedRoom.gender && !inThisRoom) return false;
      if (!student.placeable && !inThisRoom) return false;
      if (q) {
        const text = `${student.name} ${student.faculty} ${student.city}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [students, query, selectedRoom]);
  const buildingName = buildings.find((item) => item.id === buildingId)?.name ?? "Общежитие";

  function replaceRoom(next: DraftRoom) {
    setRooms((current) => current.map((room) => (room.key === next.key ? next : room)));
  }

  function clearOccupant(applicationId: string, source = rooms) {
    return source.map((room) => ({
      ...room,
      beds: room.beds.map((bed) => (bed.occupant?.applicationId === applicationId ? { ...bed, occupant: null } : bed)),
    }));
  }

  function hasOccupants(target: DraftRoom[]) {
    return target.some((room) => room.beds.some((bed) => bed.occupant));
  }

  function addFloor() {
    setError("");
    const nextLevel = floors.length ? Math.max(...floors) + 1 : 1;
    const room = makeRoom(nextLevel, nextRoomNumber(rooms), 2);
    setRooms([...rooms, room]);
    setFloor(nextLevel);
    setRoomKey(room.key);
  }

  function removeFloor(level: number) {
    const onFloor = rooms.filter((room) => room.floor === level);
    if (onFloor.length === 0) return;
    if (hasOccupants(onFloor)) {
      setError("На этаже есть заселённые койки. Сначала снимите студентов.");
      return;
    }
    setError("");
    const next = rooms.filter((room) => room.floor !== level);
    setRooms(next);
    const nextFloors = [...new Set(next.map((room) => room.floor))].sort((left, right) => left - right);
    const fallback = nextFloors[0] ?? 1;
    setFloor(fallback);
    setRoomKey(next.find((room) => room.floor === fallback)?.key ?? "");
  }

  function addRoom(onLevel = floor) {
    setError("");
    const template = selectedRoom && selectedRoom.floor === onLevel ? selectedRoom : floorRooms[0];
    const gender = template?.gender ?? "MALE";
    const bedCount = template?.beds.length ?? 2;
    const room = makeRoom(onLevel, nextRoomNumber(rooms), bedCount, gender);
    setRooms([...rooms, room]);
    setFloor(onLevel);
    setRoomKey(room.key);
  }

  function removeRoom(key: string) {
    const room = rooms.find((item) => item.key === key);
    if (!room) return;
    if (room.beds.some((bed) => bed.occupant)) {
      setError("В комнате есть студент. Сначала снимите его с койки.");
      return;
    }
    setError("");
    const next = rooms.filter((item) => item.key !== key);
    setRooms(next);
    if (roomKey === key) {
      const fallback = next.find((item) => item.floor === room.floor) ?? next[0];
      setRoomKey(fallback?.key ?? "");
      if (fallback) setFloor(fallback.floor);
    }
  }

  function duplicateNumber(number: string, floorLevel: number, exceptKey?: string) {
    return rooms.some((room) => room.floor === floorLevel && room.number === number && room.key !== exceptKey);
  }

  function patchRoom(key: string, patch: Partial<DraftRoom>) {
    const room = rooms.find((item) => item.key === key);
    if (!room) return;
    const next = { ...room, ...patch };
    if (patch.number != null && duplicateNumber(patch.number.trim(), next.floor, key)) {
      setError(`Комната ${patch.number} уже есть на этаже ${next.floor}`);
      return;
    }
    if (patch.gender && patch.gender !== room.gender) {
      const mismatched = room.beds.filter((bed) => bed.occupant?.gender && bed.occupant.gender !== patch.gender);
      if (mismatched.length > 0) {
        next.beds = next.beds.map((bed) => (bed.occupant?.gender && bed.occupant.gender !== patch.gender ? { ...bed, occupant: null } : bed));
        setMessage("Студенты другого пола сняты с коек. Не забудьте сохранить.");
      }
    }
    if (patch.floor != null && patch.floor !== room.floor && duplicateNumber(next.number, patch.floor, key)) {
      setError(`На этаже ${patch.floor} уже есть комната ${next.number}`);
      return;
    }
    setError("");
    replaceRoom(next);
    if (patch.floor != null) setFloor(patch.floor);
  }

  function addBed(key: string) {
    const room = rooms.find((item) => item.key === key);
    if (!room || room.beds.length >= 8) return;
    replaceRoom({
      ...room,
      beds: [...room.beds, { key: nextKey(), number: room.beds.length + 1, blocked: false, occupant: null }],
    });
  }

  function removeBed(key: string) {
    const room = rooms.find((item) => item.key === key);
    if (!room || room.beds.length <= 1) return;
    const last = room.beds[room.beds.length - 1];
    if (last.occupant) {
      setError("Сначала снимите студента с последней койки.");
      return;
    }
    setError("");
    replaceRoom({
      ...room,
      beds: room.beds.slice(0, -1).map((bed, index) => ({ ...bed, number: index + 1 })),
    });
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
      beds: room.beds.map((item) => (item.key === bedKey ? { ...item, occupant } : item)),
    }));
    setError("");
  }

  function releaseStudent(applicationId: string) {
    setRooms(clearOccupant(applicationId));
    setError("");
  }

  const { draggingId, overBedKey, beginDrag } = usePointerBedDrag({
    onDropOnBed: (applicationId, bedKey) => {
      const room = selectedRoomRef.current;
      if (!room) return;
      placeStudent(applicationId, room, bedKey);
    },
    onDropOnPool: (applicationId) => releaseStudent(applicationId),
  });

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
            number: room.number.trim(),
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

  const floorInfo = floorStats(rooms, floor);
  const roomInfo = selectedRoom ? roomStats(selectedRoom) : null;

  return (
    <div className="stack">
      <PageHead
        title="Жилой фонд"
        text="Выберите комнату. Тяните студента за ⠿ на койку (зажать левую кнопку мыши), затем «Сохранить»."
      >
        <div className="row">
          {dirty ? <span className="fund-dirty">Есть несохранённые изменения</span> : null}
          <Button onClick={save} disabled={!dirty || pending || !buildingId}>{pending ? "Сохраняем…" : "Сохранить"}</Button>
        </div>
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
        <div className="fund-layout">
          <div className="fund-left">
            <div className="fund-board-head">
              <strong>{buildingName}</strong>
              <span className="muted">{rooms.length} комн. · {rooms.reduce((sum, room) => sum + room.beds.length, 0)} коек</span>
            </div>
            <div className="fund-board">
              <section className="fund-col">
                <div className="fund-col-head">
                  <h3>Этажи</h3>
                  <button type="button" className="fund-icon-btn" title="Добавить этаж с одной комнатой" onClick={addFloor}>+</button>
                </div>
                <div className="fund-list">
                  {floors.map((level) => {
                    const stats = floorStats(rooms, level);
                    return (
                      <button
                        key={level}
                        type="button"
                        className={`fund-item ${level === floor && !roomKey ? "active" : level === floor ? "active-soft" : ""}`}
                        onClick={() => {
                          setFloor(level);
                          setRoomKey("");
                        }}
                      >
                        <b>Этаж {level}</b>
                        <span>{stats.rooms} комн. · {stats.beds} коек</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="fund-col">
                <div className="fund-col-head">
                  <h3>Комнаты</h3>
                  <button type="button" className="fund-icon-btn" title="Добавить комнату на выбранный этаж" onClick={() => addRoom(floor)}>+</button>
                </div>
                <div className="fund-list">
                  {floorRooms.length === 0 ? (
                    <div className="fund-empty">
                      <p>На этаже {floor} пока нет комнат.</p>
                      <Button variant="ghost" onClick={() => addRoom(floor)}>Добавить комнату</Button>
                    </div>
                  ) : floorRooms.map((room) => {
                    const stats = roomStats(room);
                    return (
                      <button
                        key={room.key}
                        type="button"
                        className={`fund-item ${room.key === selectedRoom?.key ? "active" : ""}`}
                        onClick={() => { setRoomKey(room.key); setFloor(room.floor); }}
                      >
                        <b>№ {room.number}</b>
                        <span>{room.gender === "MALE" ? "муж." : "жен."} · {stats.beds} коек · своб. {stats.free}{room.accessible ? " · доступ" : ""}{room.closed ? " · закрыта" : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="fund-col fund-col-beds">
                <div className="fund-col-head"><h3>Койки</h3></div>
                <div className="fund-list">
                  {selectedRoom ? selectedRoom.beds.map((bed) => (
                    <div
                      key={bed.key}
                      data-bed-key={bed.key}
                      className={`bed-drop ${bed.occupant ? "taken" : ""} ${bed.blocked ? "blocked" : ""} ${overBedKey === bed.key ? "over" : ""}`}
                    >
                      <div className="spread">
                        <b>Койка {bed.number}</b>
                        {!bed.occupant ? (
                          <button type="button" className="linkish" onClick={() => replaceRoom({ ...selectedRoom, beds: selectedRoom.beds.map((item) => item.key === bed.key ? { ...item, blocked: !item.blocked } : item) })}>
                            {bed.blocked ? "Разблок." : "Блок"}
                          </button>
                        ) : null}
                      </div>
                      {bed.occupant ? (
                        <span className="bed-person">
                          <span
                            className="bed-person-drag"
                            onPointerDown={(event) => beginDrag(bed.occupant!.applicationId, event)}
                          >
                            ⠿ {bed.occupant.name}
                          </span>
                          <button type="button" className="linkish" onClick={() => releaseStudent(bed.occupant!.applicationId)}>снять</button>
                        </span>
                      ) : <span className="muted">{bed.blocked ? "заблокирована" : "перетащите студента"}</span>}
                    </div>
                  )) : (
                    <p className="fund-empty">Выберите комнату в средней колонке.</p>
                  )}
                </div>
              </section>
            </div>

            <aside className="fund-inspector">
              {selectedRoom ? (
                <div className="fund-inspector-grid">
                  <div>
                    <h4>Комната № {selectedRoom.number}</h4>
                    <p className="muted">Этаж {selectedRoom.floor} · {roomInfo?.beds ?? 0} коек · занято {roomInfo?.taken ?? 0}</p>
                  </div>
                  <div className="fund-inspector-fields">
                    <Field label="Номер">
                      <input value={selectedRoom.number} onChange={(event) => patchRoom(selectedRoom.key, { number: event.target.value })} />
                    </Field>
                    <Field label="Этаж">
                      <select value={selectedRoom.floor} onChange={(event) => patchRoom(selectedRoom.key, { floor: Number(event.target.value) })}>
                        {floors.map((level) => <option key={level} value={level}>{level}</option>)}
                      </select>
                    </Field>
                    <Field label="Пол">
                      <select value={selectedRoom.gender} onChange={(event) => patchRoom(selectedRoom.key, { gender: event.target.value as Gender })}>
                        <option value="MALE">Мужской</option>
                        <option value="FEMALE">Женский</option>
                      </select>
                    </Field>
                  </div>
                  <div className="fund-inspector-actions">
                    <label className="check"><input type="checkbox" checked={selectedRoom.accessible} onChange={(event) => patchRoom(selectedRoom.key, { accessible: event.target.checked })} /> Доступная среда</label>
                    <label className="check"><input type="checkbox" checked={selectedRoom.closed} onChange={(event) => patchRoom(selectedRoom.key, { closed: event.target.checked })} /> Комната закрыта</label>
                  </div>
                  <div className="fund-bed-tools">
                    <span className="muted">Койки в комнате</span>
                    <div className="row">
                      <Button variant="ghost" onClick={() => removeBed(selectedRoom.key)} disabled={selectedRoom.beds.length <= 1}>− койка</Button>
                      <Button variant="ghost" onClick={() => addBed(selectedRoom.key)} disabled={selectedRoom.beds.length >= 8}>+ койка</Button>
                      <span className="muted">{selectedRoom.beds.length} из 8</span>
                    </div>
                  </div>
                  <div className="fund-inspector-footer">
                    <Button variant="danger" onClick={() => removeRoom(selectedRoom.key)}>Удалить комнату</Button>
                  </div>
                </div>
              ) : (
                <div className="fund-inspector-grid">
                  <div>
                    <h4>Этаж {floor}</h4>
                    <p className="muted">{floorInfo.rooms} комнат · {floorInfo.beds} коек · свободно {floorInfo.free}</p>
                  </div>
                  <p className="muted">Добавьте комнату на этом этаже или выберите комнату в списке, чтобы изменить номер, пол и число коек.</p>
                  <div className="row">
                    <Button onClick={() => addRoom(floor)}>Добавить комнату</Button>
                    <Button variant="ghost" onClick={addFloor}>Добавить этаж</Button>
                    <Button variant="danger" onClick={() => removeFloor(floor)} disabled={floorInfo.rooms === 0}>Удалить этаж</Button>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <section className="fund-students" data-student-pool>
            <header className="fund-students-head">
              <h3>
                Студенты
                {selectedRoom ? (
                  <span className="fund-students-sub">
                    {selectedRoom.gender === "MALE" ? "мужская" : "женская"} № {selectedRoom.number}
                  </span>
                ) : null}
              </h3>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск" disabled={!selectedRoom} />
            </header>
            <div className="table-wrap fund-table">
              {!selectedRoom ? (
                <p className="fund-empty fund-empty-pad">Выберите комнату в средней колонке — покажем список для заселения.</p>
              ) : visibleStudents.length === 0 ? (
                <p className="fund-empty fund-empty-pad">Нет подходящих студентов (допущены, нужный пол, свободны для этой комнаты).</p>
              ) : (
              <table>
                <thead>
                  <tr><th className="fund-drag-col" aria-label="Перетаскивание" /><th>ФИО</th><th>Возраст</th><th>Факультет</th><th>Город</th><th>Статус</th></tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => {
                    const age = fullYears(student.birthDate);
                    const here = placed.has(student.applicationId);
                    const status = here ? "На койке" : "Можно селить";
                    const active = draggingId === student.applicationId;
                    return (
                      <tr key={student.applicationId} className={here ? "student-placed fund-row-draggable" : "fund-row-draggable"}>
                        <td
                          className={`fund-drag-handle ${active ? "dragging" : ""}`}
                          title="Зажмите и перетащите на койку"
                          onPointerDown={(event) => beginDrag(student.applicationId, event)}
                        >
                          ⠿
                        </td>
                        <td>{student.name}</td>
                        <td>{age == null ? "—" : age}</td>
                        <td>{student.faculty || "—"}</td>
                        <td>{student.city || "—"}</td>
                        <td className="fund-student-status">{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
