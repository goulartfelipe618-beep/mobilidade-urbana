import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "./app/session";
import { Shell } from "./components/Shell";
import { AccountPage } from "./pages/AccountPage";
import { ActivityPage } from "./pages/ActivityPage";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";
import { RidePage } from "./pages/RidePage";

function Protected({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<Protected><Shell /></Protected>}>
            <Route index element={<HomePage />} />
            <Route path="corrida" element={<RidePage />} />
            <Route path="atividade" element={<ActivityPage />} />
            <Route path="conta" element={<AccountPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
