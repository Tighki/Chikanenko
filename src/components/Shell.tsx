import { Link, NavLink, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "../auth";
import { ROLE_LABELS } from "../labels";
import { Logo } from "./Logo";
import { Button } from "./ui";

const staffLinks = [
  ["/staff", "Сводка"],
  ["/staff/applications", "Заявки"],
  ["/staff/housing", "Жилой фонд"],
  ["/staff/settlement", "Автозаселение"],
  ["/staff/import", "Импорт"],
  ["/staff/report", "Отчёт"],
];

const adminLinks = [
  ["/admin/users", "Пользователи"],
  ["/admin/priorities", "Льготы"],
  ["/admin/campaign", "Кампания"],
  ["/admin/audit", "Журнал"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = staffLinks;

  if (!user) return null;

  const home = homeFor(user.role);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to={home} className="brand">
          <Logo className="logo" />
          <span>Общежитие</span>
        </Link>
        <nav className="nav">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/staff"}>
              {label}
            </NavLink>
          ))}
          {user.role === "ADMIN"
            ? adminLinks.map(([to, label]) => (
                <NavLink key={to} to={to}>
                  {label}
                </NavLink>
              ))
            : null}
        </nav>
        <div className="account">
          <div>
            <strong>{user.fullName}</strong>
            <div className="muted">{ROLE_LABELS[user.role]}</div>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Выйти
          </Button>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
