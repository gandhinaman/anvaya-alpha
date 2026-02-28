import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/shared/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import ParentApp from "./pages/ParentApp";
import ChildApp from "./pages/ChildApp";
import RoleRedirect from "./pages/RoleRedirect";
import InstallPage from "./pages/InstallPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Request microphone permission once on app load so it's granted for the
// entire session. The browser remembers the decision per origin, so
// subsequent getUserMedia / SpeechRecognition calls won't re-prompt.
function useEarlyPermissions() {
  useEffect(() => {
    // Only request if not already granted/denied
    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((status) => {
        if (status.state === "prompt") {
          navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => stream.getTracks().forEach((t) => t.stop()))
            .catch(() => {});
        }
      }).catch(() => {
        // permissions.query not supported — request directly
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((stream) => stream.getTracks().forEach((t) => t.stop()))
          .catch(() => {});
      });
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => stream.getTracks().forEach((t) => t.stop()))
        .catch(() => {});
    }
  }, []);
}

const App = () => {
  useEarlyPermissions();

return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/install" element={<InstallPage />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute><RoleRedirect /></ProtectedRoute>} />
          <Route path="/sathi" element={<ProtectedRoute><ParentApp /></ProtectedRoute>} />
          <Route path="/guardian" element={<ProtectedRoute><ChildApp /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
