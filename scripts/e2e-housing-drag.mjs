/**
 * E2E: pointer drag student → bed (local API :4000, Vite :5173, seeded DB).
 * One-time: npm install -D playwright xlsx && npx playwright install chromium
 * Run: node scripts/e2e-housing-drag.mjs
 */
import { chromium } from "playwright";

const API = "http://127.0.0.1:4000";
const APP = "http://127.0.0.1:5173";

async function api(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `${response.status} ${path}`);
  return data;
}

async function ensurePlaceableStudent(token) {
  const workspace = await api("/api/housing/workspace", token);
  const existing = workspace.students.find((s) => s.placeable && s.gender === "MALE");
  if (existing) return existing.name;

  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([
    ["ФИО", "Пол", "Дата рождения", "Город", "Регион", "Улица", "Дом", "Квартира", "Факультет", "Направление", "Балл", "Категория", "Email", "Телефон"],
    ["Тестов Тест Тестович", "м", "2008-05-01", "Тула", "Тульская область", "ул. Ленина", "10", "4", "ИТ", "ПИ", 230, "без льготы", "drag.test@hostel.local", "+79001112233"],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Абитуриенты");
  const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

  const form = new FormData();
  form.append("file", new Blob([buffer]), "test.xlsx");
  const importRes = await fetch(`${API}/api/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const importData = await importRes.json().catch(() => ({}));
  if (!importRes.ok) throw new Error(importData.error || "import failed");

  const apps = await api("/api/staff/applications?status=SUBMITTED", token);
  const app = apps.applications?.find((a) => a.email === "drag.test@hostel.local")
    ?? apps.applications?.[0];
  if (!app) throw new Error("No application after import");

  const detail = await api(`/api/staff/applications/${app.id}`, token);
  let docs = detail.application?.documents ?? [];
  if (docs.length === 0) {
    const docForm = new FormData();
    docForm.append("type", "PASSPORT");
    docForm.append("file", new Blob(["test"], { type: "application/pdf" }), "passport.pdf");
    const uploadRes = await fetch(`${API}/api/staff/applications/${app.id}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: docForm,
    });
    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) throw new Error(uploadData.error || "document upload failed");
    docs = [uploadData.document];
  }

  for (const doc of docs) {
    if (doc.status === "VERIFIED") continue;
    await api(`/api/staff/documents/${doc.id}/review`, token, {
      method: "POST",
      body: JSON.stringify({ status: "VERIFIED" }),
    });
  }

  await api(`/api/staff/applications/${app.id}/status`, token, {
    method: "POST",
    body: JSON.stringify({ status: "APPROVED" }),
  });

  return "Тестов Тест Тестович";
}

async function main() {
  const login = await api("/api/auth/login", null, {
    method: "POST",
    body: JSON.stringify({ email: "staff@hostel.local", password: "Staff123" }),
  });
  const studentName = await ensurePlaceableStudent(login.token);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${APP}/login`);
  await page.fill('input[type="email"]', "staff@hostel.local");
  await page.fill('input[type="password"]', "Staff123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/staff/);

  await page.goto(`${APP}/staff/housing`);
  await page.waitForSelector(".fund-board");

  await page.locator(".fund-item").filter({ hasText: "№ 101" }).first().click();
  await page.waitForSelector(".fund-drag-handle");

  const handle = page.locator(".fund-drag-handle").first();
  const bed = page.locator("[data-bed-key]").first();
  const handleBox = await handle.boundingBox();
  const bedBox = await bed.boundingBox();
  if (!handleBox || !bedBox) throw new Error("Missing drag targets");

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(bedBox.x + bedBox.width / 2, bedBox.y + bedBox.height / 2, { steps: 12 });
  await page.mouse.up();

  await page.waitForSelector(".bed-person-drag", { timeout: 3000 });
  const bedText = await page.locator(".bed-person-drag").first().textContent();
  if (!bedText?.includes("Тестов")) {
    throw new Error(`Expected student on bed, got: ${bedText}`);
  }

  console.log("OK: pointer drag placed", studentName);
  await browser.close();
}

main().catch((error) => {
  console.error("FAIL:", error.message);
  process.exit(1);
});
