import "./App.css";
//this allows us to use react router dom to navigate between pages
import { HashRouter, Routes, Route } from "react-router-dom";

//each individual page is imported here.
import RegisterPage from "./pages/RegisterPage";
import LandingPage from "./pages/LandingPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetCodePage from "./pages/ResetCodePage";
import NewPasswordPage from "./pages/NewPasswordPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import LoggedOutPage from "./pages/LoggedOutPage";
import HomePage from "./pages/HomePage";
import MedicationsPage from "./pages/MedicationsPage";
import JournalPage from "./pages/JournalPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import CaregiversPage from "./pages/CaregiversPage";

function App() {
  return (
    <HashRouter>
      <Routes>
        {/*add route to other pages here with "<Route path="/page-name" element={<"page-name"/>}/> as shown*/}
        {/*landing page is first page seen so its route is just "/" the rest are named*/}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-code" element={<ResetCodePage />} />
        <Route path="/new-password" element={<NewPasswordPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logged-out" element={<LoggedOutPage />} />
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/medications" element={<MedicationsPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/caregivers" element={<CaregiversPage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
