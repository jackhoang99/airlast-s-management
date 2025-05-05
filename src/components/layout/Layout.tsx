import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import NoSupabaseAlert from '../ui/NoSupabaseAlert';
import { useSupabase } from '../../lib/supabase-context';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { supabase, isLoading } = useSupabase();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 sm:px-6">
          <button
            type="button"
            className="md:hidden mr-4 text-gray-500 hover:text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <div className="flex-1 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Airlast HVAC Administration</h1>
            <div className="relative">
              <input
                type="search"
                placeholder="Search..."
                className="input w-full max-w-xs"
              />
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!isLoading && !supabase ? (
            <NoSupabaseAlert />
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};

export default Layout;