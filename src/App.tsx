import { Navigate, Route, Routes } from "react-router-dom";
import { homeFor, useAuth, type Role } from "./auth";
import { Shell } from "./components/Shell";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { ApplicantHome } from "./pages/applicant/Home";
import { ProfilePage } from "./pages/applicant/Profile";
import { ApplicationPage } from "./pages/applicant/Application";
import { NotificationsPage } from "./pages/Notifications";
import { StaffHome } from "./pages/staff/Dashboard";
import { ApplicationsPage } from "./pages/staff/Applications";
import { ReviewPage } from "./pages/staff/Review";
import { HousingPage } from "./pages/staff/Housing";
import { SettlementPage } from "./pages/staff/Settlement";
import { AssignmentsPage } from "./pages/staff/Assignments";
import { ImportPage } from "./pages/staff/Import";
import { ReportPage } from "./pages/staff/Report";
import { UsersPage } from "./pages/admin/Users";
import { PrioritiesPage } from "./pages/admin/Priorities";
import { CampaignPage } from "./pages/admin/Campaign";
import { AuditPage } from "./pages/admin/Audit";

function Gate({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Shell>{children}</Shell>;
}

function Guest({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Загрузка…</div>;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><LoginPage /></Guest>} />
      <Route path="/register" element={<Guest><RegisterPage /></Guest>} />
      <Route path="/app" element={<Gate roles={["APPLICANT"]}><ApplicantHome /></Gate>} />
      <Route path="/app/profile" element={<Gate roles={["APPLICANT"]}><ProfilePage /></Gate>} />
      <Route path="/app/application" element={<Gate roles={["APPLICANT"]}><ApplicationPage /></Gate>} />
      <Route path="/app/notifications" element={<Gate roles={["APPLICANT"]}><NotificationsPage /></Gate>} />
      <Route path="/staff" element={<Gate roles={["STAFF", "ADMIN"]}><StaffHome /></Gate>} />
      <Route path="/staff/applications" element={<Gate roles={["STAFF", "ADMIN"]}><ApplicationsPage /></Gate>} />
      <Route path="/staff/applications/:id" element={<Gate roles={["STAFF", "ADMIN"]}><ReviewPage /></Gate>} />
      <Route path="/staff/housing" element={<Gate roles={["STAFF", "ADMIN"]}><HousingPage /></Gate>} />
      <Route path="/staff/settlement" element={<Gate roles={["STAFF", "ADMIN"]}><SettlementPage /></Gate>} />
      <Route path="/staff/assignments" element={<Gate roles={["STAFF", "ADMIN"]}><AssignmentsPage /></Gate>} />
      <Route path="/staff/import" element={<Gate roles={["STAFF", "ADMIN"]}><ImportPage /></Gate>} />
      <Route path="/staff/report" element={<Gate roles={["STAFF", "ADMIN"]}><ReportPage /></Gate>} />
      <Route path="/staff/notifications" element={<Gate roles={["STAFF", "ADMIN"]}><NotificationsPage /></Gate>} />
      <Route path="/admin/users" element={<Gate roles={["ADMIN"]}><UsersPage /></Gate>} />
      <Route path="/admin/priorities" element={<Gate roles={["ADMIN"]}><PrioritiesPage /></Gate>} />
      <Route path="/admin/campaign" element={<Gate roles={["ADMIN"]}><CampaignPage /></Gate>} />
      <Route path="/admin/audit" element={<Gate roles={["ADMIN"]}><AuditPage /></Gate>} />
      <Route path="*" element={<Start />} />
    </Routes>
  );
}

function Start() {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Загрузка…</div>;
  return <Navigate to={user ? homeFor(user.role) : "/login"} replace />;
}
