import { Routes, Route } from "react-router-dom";
import TechnicianLayout from "./components/layout/TechnicianLayout";
import TechnicianLogin from "./pages/TechnicianLogin";
import TechnicianHome from "./pages/TechnicianHome";
import TechnicianJobs from "./pages/TechnicianJobs";
import TechnicianJobDetails from "./pages/TechnicianJobDetails";
import TechnicianSchedule from "./pages/TechnicianSchedule";
import TechnicianMap from "./pages/TechnicianMap";
import RequireTechAuth from "./components/auth/RequireTechAuth";
import TechnicanHvacbot from "./pages/TechnicanHvacBot";
import MyAccount from "../pages/MyAccount";
import { useEffect } from "react";

function TechnicianApp() {
  useEffect(() => {
    const updateFavicon = () => {
      const favicon = document.getElementById("favicon");
      if (favicon) {
        favicon.setAttribute("href", "/airlast-logo.svg");
      }
    };

    updateFavicon();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<TechnicianLogin />} />

      <Route element={<RequireTechAuth />}>
        <Route element={<TechnicianLayout />}>
          <Route index element={<TechnicianHome />} />
          <Route path="jobs" element={<TechnicianJobs />} />
          <Route path="jobs/:id" element={<TechnicianJobDetails />} />
          <Route path="schedule" element={<TechnicianSchedule />} />
          <Route path="map" element={<TechnicianMap />} />
          <Route path="hvacbot" element={<TechnicanHvacbot />} />
          <Route path="account" element={<MyAccount />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default TechnicianApp;