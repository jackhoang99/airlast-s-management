import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import CreateCompany from './pages/CreateCompany';
import EditCompany from './pages/EditCompany';
import CompanyDetails from './pages/CompanyDetails';
import CreateLocation from './pages/CreateLocation';
import EditLocation from './pages/EditLocation';
import Locations from './pages/Locations';
import Units from './pages/Units';
import AddUnit from './pages/AddUnit';
import EditUnit from './pages/EditUnit';
import NotFound from './pages/NotFound';
import RequireAuth from './components/auth/RequireAuth';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="companies">
            <Route index element={<Companies />} />
            <Route path="create" element={<CreateCompany />} />
            <Route path=":id" element={<CompanyDetails />} />
            <Route path=":id/edit" element={<EditCompany />} />
            <Route path=":companyId/location/new" element={<CreateLocation />} />
            <Route path=":companyId/locations/:locationId/edit" element={<EditLocation />} />
          </Route>
          <Route path="locations">
            <Route index element={<Locations />} />
            <Route path="create" element={<CreateLocation />} />
            <Route path=":id/edit" element={<EditLocation />} />
          </Route>
          <Route path="units">
            <Route index element={<Units />} />
            <Route path="add" element={<AddUnit />} />
            <Route path=":id/edit" element={<EditUnit />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;