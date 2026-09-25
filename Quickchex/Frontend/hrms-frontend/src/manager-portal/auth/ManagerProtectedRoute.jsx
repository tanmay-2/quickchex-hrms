import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useManagerAuth } from "./ManagerAuthContext";

export const ManagerProtectedRoute = ({ children }) => {
  const { isAuthenticated, token, role } = useManagerAuth();
  const location = useLocation();

  // If completely unauthenticated, redirect to the ONE common login page
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but unauthorized (Admin or Employee attempting direct URL access to /manager)
  if (!isAuthenticated) {
    if (role === "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    if (role === "employee" || role === "teamleader") {
      return <Navigate to="/dashboard_emp" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
