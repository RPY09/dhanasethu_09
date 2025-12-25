import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "../components/ProtectedRoute";
import Dashboard from "../pages/Dashboard";
import AddTransaction from "../pages/AddTransaction";
import Transactions from "../pages/Transactions";
import EditTransaction from "../pages/EditTransaction";
import Analytics from "../pages/Analytics";
import Profile from "../pages/Profile";

const AppRoutes = () => {
  console.log("Routes rendered");
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-transaction"
        element={
          <ProtectedRoute>
            <AddTransaction />
          </ProtectedRoute>
        }
      />

      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-transaction/:id"
        element={
          <ProtectedRoute>
            <EditTransaction />
          </ProtectedRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />

      {/* Optional: fallback route */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
};

export default AppRoutes;
