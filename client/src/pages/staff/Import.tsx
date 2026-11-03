import { useState, type FormEvent } from "react";
import { api, downloadFile } from "../../api";
import { Banner, Button, PageHead } from "../../components/ui";

type Result = {
  created: { email: string; password: string; name: string }[];
  updated: { email: string; name: string }[];
  errors: { row: number; message: string }[];
};

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError("");
    const body = new FormData();
    body.set("file", file);
    try {
      const data = await api<Result>("/api/import", { method: "POST", body });
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Импорт не выполнен");
    }
  }

  return (
    <div className="stack">
      <PageHead title="Импорт списка" text="Колонки: ФИО, Пол, Дата рождения, Город, Регион, Факультет, Направление, Балл, Категория, Email, Телефон. Совпадение по почте обновляет анкету." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      <form className="panel-block stack" onSubmit={onSubmit}>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <div className="row">
          <Button type="submit" disabled={!file}>Загрузить список</Button>
          <Button type="button" variant="ghost" onClick={() => downloadFile("/api/import/template", "abiturienty.xlsx")}>Скачать шаблон</Button>
        </div>
      </form>
      {result ? (
        <section className="stack">
          <Banner kind="ok">Создано {result.created.length}, обновлено {result.updated.length}, ошибок {result.errors.length}.</Banner>
          {result.created.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Новый абитуриент</th><th>Почта</th><th>Временный пароль</th></tr></thead>
                <tbody>
                  {result.created.map((item) => (
                    <tr key={item.email}><td>{item.name}</td><td>{item.email}</td><td>{item.password}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {result.errors.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Строка</th><th>Ошибка</th></tr></thead>
                <tbody>{result.errors.map((item) => <tr key={item.row}><td>{item.row}</td><td>{item.message}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
