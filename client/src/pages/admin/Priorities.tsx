import { useEffect, useState } from "react";
import { api } from "../../api";
import { Banner, Button, PageHead } from "../../components/ui";

type Rule = { category: string; rank: number; title: string };

export function PrioritiesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ rules: Rule[] }>("/api/admin/priorities").then((data) => setRules(data.rules));
  }, []);

  async function save() {
    setError("");
    setMessage("");
    try {
      await api("/api/admin/priorities", { method: "PUT", body: JSON.stringify({ rules }) });
      setMessage("Порядок льгот сохранён");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Не удалось сохранить");
    }
  }

  return (
    <div className="stack">
      <PageHead title="Льготы" text="Меньший ранг заселяется раньше. Ранги не должны повторяться." />
      {error ? <Banner kind="error">{error}</Banner> : null}
      {message ? <Banner kind="ok">{message}</Banner> : null}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Ранг</th><th>Название</th></tr></thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={rule.category}>
                <td><input type="number" min={1} max={20} value={rule.rank} onChange={(event) => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, rank: Number(event.target.value) } : item))} /></td>
                <td><input value={rule.title} onChange={(event) => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button onClick={save}>Сохранить порядок</Button>
    </div>
  );
}
