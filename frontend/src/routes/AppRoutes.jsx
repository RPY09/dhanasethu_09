import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import SetupSecurity from "../pages/SetupSecurity";
import AppLock from "../pages/AppLock";

import ProtectedRoute from "../components/ProtectedRoute";

import Dashboard from "../pages/Dashboard";
import AddTransaction from "../pages/AddTransaction";
import Transactions from "../pages/Transactions";
import EditTransaction from "../pages/EditTransaction";
import Analytics from "../pages/Analytics";
import Profile from "../pages/Profile";
import Loan from "../pages/Loans";
import Notifications from "../pages/Notifications";
import EditLoan from "../pages/EditLoan";

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/*SECURITY SETUP (LOGGED-IN ONLY) */}
      <Route
        path="/app-lock"
        element={
          <ProtectedRoute>
            <AppLock />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup-security"
        element={
          <ProtectedRoute>
            <SetupSecurity />
          </ProtectedRoute>
        }
      />

      {/* PROTECTED ROUTES */}
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
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/loan"
        element={
          <ProtectedRoute>
            <Loan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit/:id"
        element={
          <ProtectedRoute>
            <EditLoan />
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

      {/* FALLBACK */}
      <Route path="*" element={<Home />} />
    </Routes>
  );
};

export default AppRoutes;
