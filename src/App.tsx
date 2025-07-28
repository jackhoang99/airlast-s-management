import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import { useEffect } from "react";
import { useSupabase } from "./lib/supabase-context";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import CreateCompany from "./pages/CreateCompany";
import EditCompany from "./pages/EditCompany";
import CompanyDetails from "./pages/CompanyDetails";
import CreateLocation from "./pages/CreateLocation";
import EditLocation from "./pages/EditLocation";
import LocationDetails from "./pages/LocationDetails";
import AllJobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import JobDetails from "./pages/JobDetails";
import DispatchSchedule from "./pages/DispatchSchedule";
import UnitDetails from "./pages/UnitDetails";
import UnitAssets from "./pages/UnitAssets";
import AddUnit from "./pages/AddUnit";
import EditUnit from "./pages/EditUnit";
import Units from "./pages/Units";
import Settings from "./pages/Settings";
import ItemPrices from "./pages/ItemPrices";
import NotFound from "./pages/NotFound";
import RequireAuth from "./components/auth/RequireAuth";
import AddTechnician from "./pages/AddTechnician";
import Locations from "./pages/Locations";
import Invoices from "./pages/Invoices";
import PendingInvoices from "./pages/PendingInvoices";
import PaidInvoices from "./pages/PaidInvoices";
import InvoiceReports from "./pages/InvoiceReports";
import QuoteConfirmation from "./pages/QuoteConfirmation";
import QuoteTemplates from "./pages/QuoteTemplates";
import TechnicianApp from "./technician-side/TechnicianApp";
import CustomerApp from "./customer-side/CustomerApp";
import MyAccount from "./pages/MyAccount";
import TemplateDebug from "./pages/TemplateDebug";
import Contacts from "./pages/Contacts";
import PublicUnitDetails from "./pages/PublicUnitDetails";
import Assets from "./pages/Assets";
import AllQuotes from "./pages/AllQuotes";
import Permits from "./pages/Permits";

// Customer Portal
import CustomerLogin from "./pages/CustomerLogin";
import ServiceOpportunities from "./pages/ServiceOpportunities";
import TechScorecard from "./pages/TechScorecard";
import PMHistory from "./pages/PMHistory";
import CreateInvoice from "./pages/CreateInvoice";

function App() {
  const { supabase } = useSupabase();

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
      <Route path="/login" element={<Login />} />
      <Route path="/quote/confirm/:token" element={<QuoteConfirmation />} />

      {/* Public Unit Details Route - No Auth Required */}
      <Route path="/units/public/:id" element={<PublicUnitDetails />} />

      {/* Technician Routes */}
      <Route path="/tech/*" element={<TechnicianApp />} />

      {/* Customer Portal Routes */}
      <Route path="/customer/*" element={<CustomerApp />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="companies">
            <Route index element={<Companies />} />
            <Route path="create" element={<CreateCompany />} />
            <Route path=":id" element={<CompanyDetails />} />
            <Route path=":id/edit" element={<EditCompany />} />
            <Route
              path=":companyId/location/new"
              element={<CreateLocation />}
            />
            <Route
              path=":companyId/locations/:locationId/edit"
              element={<EditLocation />}
            />
          </Route>
          <Route path="locations">
            <Route index element={<Locations />} />
            <Route path=":id" element={<LocationDetails />} />
            <Route path=":id/edit" element={<EditLocation />} />
            <Route path=":locationId/units/add" element={<AddUnit />} />
          </Route>

          <Route path="units">
            <Route index element={<Units />} />
            <Route path=":id" element={<UnitDetails />} />
            <Route path=":id/assets" element={<UnitAssets />} />
            <Route path=":id/edit" element={<EditUnit />} />
          </Route>

          <Route path="assets" element={<Assets />} />

          <Route path="contacts" element={<Contacts />} />
          <Route path="jobs">
            <Route index element={<AllJobs />} />
            <Route path=":id" element={<JobDetails />} />
            <Route path="create" element={<CreateJob />} />
            <Route path="dispatch" element={<DispatchSchedule />} />
            <Route path="opportunities" element={<ServiceOpportunities />} />
            <Route path="scorecard" element={<TechScorecard />} />
            <Route path="pm-history" element={<PMHistory />} />
          </Route>
          <Route path="invoices">
            <Route index element={<Invoices />} />
            <Route path="pending" element={<PendingInvoices />} />
            <Route path="paid" element={<PaidInvoices />} />
            <Route path="reports" element={<InvoiceReports />} />
          </Route>
          <Route path="create-invoice/:entityType/:entityId" element={<CreateInvoice />} />
          <Route path="quotes">
            <Route path="templates" element={<QuoteTemplates />} />
          </Route>
          <Route path="all-quotes" element={<AllQuotes />} />
          <Route path="permits" element={<Permits />} />
          <Route path="technicians">
            <Route path="add" element={<AddTechnician />} />
          </Route>
          <Route path="settings" element={<Settings />} />
          <Route path="item-prices" element={<ItemPrices />} />
          <Route path="account" element={<MyAccount />} />
          <Route path="template-debug" element={<TemplateDebug />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
