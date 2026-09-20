import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import CreateChallan from "./components/CreateChallan";
import "./App.css";

/** Blocks a route when nobody is logged in. */
function RequireAuth({ isLoggedIn, children }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || "",
  );

  const isLoggedIn = Boolean(username);

  const handleLogin = (name) => {
    localStorage.setItem("username", name);
    setUsername(name);
    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    setUsername("");
    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/dashboard"
        element={
          <RequireAuth isLoggedIn={isLoggedIn}>
            <Dashboard username={username} onLogout={handleLogout} />
          </RequireAuth>
        }
      />

      {/* Add routes for different pages here */}
      <Route
        path="/challan/new"
        element={
          <RequireAuth isLoggedIn={isLoggedIn}>
            <CreateChallan />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div
      className="no-scrollbar"
      style={{ overflowY: "auto", height: "100vh" }}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}
