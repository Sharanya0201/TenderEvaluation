import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SidebarProvider } from "./context/SidebarContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ProtectedRoute from "./components/ProtectedRoute";
import SidebarLayout from "./layouts/SidebarLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import UserManagementPage from "./pages/UserManagementPage";
import RoleManagementPage from "./pages/RoleManagementPage";
import ManageTenderTypesPage from "./pages/ManageTenderTypes";
import EvaluationCriteriaPage from "./pages/EvaluationCriteriaPage";
import TenderStatus from "./pages/Tenderstatus";
// Upload page (combined tender + vendor uploader)
import UploadPage from "./pages/UploadPage";

function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Routes>
          {/* Public routes */}
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* ✅ Protected layout routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <SidebarLayout />
              </ProtectedRoute>
            }
            
          >
           
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="user-management" element={<UserManagementPage />} />
            <Route path="role-management" element={<RoleManagementPage />} />
            <Route path="tendertypes" element={<ManageTenderTypesPage />} />
            <Route path="Tenderstatus" element={<TenderStatus />} />
            <Route path="evaluationcriteria" element={<EvaluationCriteriaPage />} />
           {/* Upload routes (match Sidebar entries) */}
            <Route path="uploads" element={<UploadPage />} />
            <Route path="vendor-uploads" element={<UploadPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<LoginPage />} />
        </Routes>

        <ToastContainer position="top-center" />
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;