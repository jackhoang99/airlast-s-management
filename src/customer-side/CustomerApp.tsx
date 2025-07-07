import { Routes, Route } from "react-router-dom";
import CustomerPortal from "./components/layout/CustomerPortal";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerLocations from "./pages/CustomerLocations";
import CustomerLocationDetails from "./pages/CustomerLocationDetails";
import CustomerUnits from "./pages/CustomerUnits";
import CustomerUnitDetails from "./pages/CustomerUnitDetails";
import CustomerUnitAssets from "./pages/CustomerUnitAssets";
import CustomerJobs from "./pages/CustomerJobs";
import CustomerJobDetails from "./pages/CustomerJobDetails";
import CustomerInvoices from "./pages/CustomerInvoices";
import CustomerInvoiceDetails from "./pages/CustomerInvoiceDetails";
import CustomerAssets from "./pages/CustomerAssets";
import RequireCustomerAuth from "./components/auth/RequireCustomerAuth";
import { useEffect } from "react";

function CustomerApp() {
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
      <Route path="/login" element={<CustomerLogin />} />

      <Route element={<RequireCustomerAuth />}>
        <Route element={<CustomerPortal />}>
          <Route index element={<CustomerDashboard />} />
          <Route path="locations" element={<CustomerLocations />} />
          <Route path="locations/:id" element={<CustomerLocationDetails />} />
          <Route path="units" element={<CustomerUnits />} />
          <Route path="units/:id" element={<CustomerUnitDetails />} />
          <Route path="units/:id/assets" element={<CustomerUnitAssets />} />
          <Route path="jobs" element={<CustomerJobs />} />
          <Route path="jobs/:id" element={<CustomerJobDetails />} />
          <Route path="invoices" element={<CustomerInvoices />} />
          <Route path="invoices/:id" element={<CustomerInvoiceDetails />} />
          <Route path="assets" element={<CustomerAssets />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default CustomerApp;