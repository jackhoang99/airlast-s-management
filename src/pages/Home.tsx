import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSupabase } from '../lib/supabase-context';
import { Building2, Plus, Filter } from 'lucide-react';
import { Calendar, Clock, ClipboardList, AlertTriangle, FileCheck2, Bell, FileInput as FileInvoice, CalendarClock, Send } from 'lucide-react';

const Home = () => {
  const { supabase } = useSupabase();
  const [stats, setStats] = useState({
    jobsNoAppointment: 0,
    overdueJobs: 0,
    jobsToMark: 0,
    followUpJobs: 0,
    openDeficiencies: 0,
    unsentInvoices: 0,
    jobsToSchedule: 0,
    jobsToInvoice: 0,
    submittedQuotes: 0
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select className="select">
              <option>All Offices</option>
            </select>
            <select className="select">
              <option>All Technicians</option>
            </select>
            <select className="select">
              <option>Last Month</option>
            </select>
          </div>
          <Link to="/companies/create" className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Add Company
          </Link>
        </div>
      </div>

      {/* Schedule Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Daily Schedule</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary">
              <Clock size={16} className="mr-2" />
              Today, May 6
            </button>
            <button className="btn btn-primary">
              <Plus size={16} className="mr-2" />
              Add Filter
            </button>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          No data to display.
          <br />
          Try a wider filter set!
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <ClipboardList size={16} />
              Jobs with No Appointment
            </h3>
            <span className="text-2xl font-semibold">{stats.jobsNoAppointment}</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle size={16} />
              Overdue Jobs
            </h3>
            <span className="text-2xl font-semibold text-error-600">{stats.overdueJobs}</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <FileCheck2 size={16} />
              Past Jobs to Mark Complete
            </h3>
            <span className="text-2xl font-semibold">{stats.jobsToMark}</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Bell size={16} />
              Follow Up Jobs
            </h3>
            <span className="text-2xl font-semibold">{stats.followUpJobs}</span>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <AlertTriangle size={16} />
              Open Deficiencies
            </h3>
            <span className="text-2xl font-semibold">{stats.openDeficiencies}</span>
          </div>
          <div className="text-center py-12 text-gray-500">
            No data to display.
            <br />
            Try a wider filter set!
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <FileInvoice size={16} />
              Total Unsent Invoices
            </h3>
            <span className="text-2xl font-semibold">{stats.unsentInvoices}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>In value</span>
            <span>$0</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <CalendarClock size={16} />
              Jobs Ready to Schedule
            </h3>
            <span className="text-2xl font-semibold">{stats.jobsToSchedule}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>In estimated revenue</span>
            <span>$0</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium flex items-center gap-2">
              <Send size={16} />
              Total Submitted Quotes
            </h3>
            <span className="text-2xl font-semibold">{stats.submittedQuotes}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>In value</span>
            <span>$0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;