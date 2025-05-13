import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, DollarSign, FileText, Clock, Package, AlertTriangle, FileInput as FileInvoice, MessageSquare, Paperclip, Building2, Tag, Send, Copy } from 'lucide-react';
import { Database } from '../types/supabase';
import Map from '../components/ui/Map';

type Job = {
  id: string;
  number: string;
  name: string;
  status: 'scheduled' | 'unscheduled' | 'completed';
  type: 'preventative maintenance' | 'service call';
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    company: string;
    email: string;
    phone: string;
  };
  schedule: {
    start: string;
    duration: string;
  };
  cost?: number;
  invoiced?: boolean;
  training?: boolean;
  timePeriod: {
    start: string;
    due: string;
  };
  owner: string;
  contact: {
    name: string;
    phone: string;
  };
  contract?: string;
  office?: string;
};

const JobDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockJob: Job = {
      id: '40751566',
      number: '40751566',
      name: 'Plomeek & Gespar',
      status: 'unscheduled',
      type: 'preventative maintenance',
      location: {
        name: 'Plomeek & Gespar',
        address: '3500 John A Merrit Blvd',
        city: 'Nashville',
        state: 'TN',
        company: 'Vulcan Science Academy',
        email: 'support@vulcanlogic.com',
        phone: '(555) 234-2432'
      },
      schedule: {
        start: '05/01/2025',
        duration: ''
      },
      cost: 500,
      training: true,
      timePeriod: {
        start: '05/01/2025',
        due: '05/31/2025'
      },
      owner: 'ServiceTrade Support User (Do Not Delete)',
      contact: {
        name: 'Sarek - Owner',
        phone: '(555) 234-2432'
      },
      contract: '(DEMO) Airlast Inc. Standard Contract',
      office: 'Main Office'
    };

    setJob(mockJob);
  }, [id]);

  if (!job) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge ${job.type === 'preventative maintenance' ? 'badge-purple' : 'badge-cyan'}`}>
                {job.type}
              </span>
              {job.training && (
                <span className="badge badge-blue">training</span>
              )}
            </div>
            <h1 className="text-2xl font-bold mt-1">Job {job.number}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn btn-secondary">
            <Tag className="h-4 w-4 mr-2" />
            Edit Tags
          </button>
          <button className="btn btn-primary">
            <Send className="h-4 w-4 mr-2" />
            Send Service Link
          </button>
        </div>
      </div>

      {/* Job Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Details Section */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-500">Job Owner</label>
                <p>{job.owner}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Job Contact</label>
                <p>{job.contact.name}</p>
                <p className="text-sm text-gray-500">{job.contact.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Company</label>
                <p>{job.location.company}</p>
                <p className="text-sm text-gray-500">{job.location.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Contract</label>
                <p className="text-primary-600 hover:text-primary-800 cursor-pointer">
                  {job.contract}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Office</label>
                <p>{job.office}</p>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            <div className="flex items-start gap-2 mb-4">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">{job.location.name}</p>
                <p>{job.location.address}</p>
                <p>{job.location.city}, {job.location.state}</p>
              </div>
            </div>
            <Map 
              address={job.location.address}
              city={job.location.city}
              state={job.location.state}
              zip=""
              className="h-[300px] rounded-lg"
            />
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`${
                  activeTab === 'details'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`${
                  activeTab === 'appointments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Appointments
              </button>
              <button
                onClick={() => setActiveTab('items')}
                className={`${
                  activeTab === 'items'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
              >
                Parts | Labor | Items
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'details' && (
              <>
                {/* Clock Events */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      Clock Events
                    </h2>
                    <span className="badge">0 Events</span>
                  </div>
                  <p className="text-gray-500 text-center py-4">No clock events found</p>
                </div>

                {/* Assets */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      Assets
                    </h2>
                    <span className="badge">0 Assets</span>
                  </div>
                  <p className="text-gray-500 text-center py-4">No assets found</p>
                </div>

                {/* Deficiencies */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-gray-400" />
                      Deficiencies
                    </h2>
                    <span className="badge">0 Deficiencies</span>
                  </div>
                  <p className="text-gray-500 text-center py-4">No deficiencies found</p>
                </div>

                {/* Invoices */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FileInvoice className="h-5 w-5 text-gray-400" />
                      Invoices
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="badge">0 Invoices</span>
                      <span className="badge badge-success">$0.00</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-center py-4">No invoices found</p>
                </div>

                {/* Comments */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                      Comments
                    </h2>
                    <span className="badge">0 Comments</span>
                  </div>
                  <p className="text-gray-500 text-center py-4">No comments found</p>
                </div>

                {/* Attachments */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                      Attachments
                    </h2>
                    <span className="badge">0 Attachments</span>
                  </div>
                  <p className="text-gray-500 text-center py-4">No attachments found</p>
                </div>
              </>
            )}

            {activeTab === 'appointments' && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Appointments</h2>
                  <button className="btn btn-primary">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </button>
                </div>
                <p className="text-gray-500 text-center py-4">No appointments scheduled</p>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="card">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Parts | Labor | Items</h2>
                  <button className="btn btn-primary">
                    <Package className="h-4 w-4 mr-2" />
                    Add Item
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Item</th>
                        <th>Service Line</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-4">
                          No items found
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Job Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Job Status</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`badge ${job.status === 'scheduled' ? 'badge-success' : job.status === 'unscheduled' ? 'badge-warning' : 'badge-info'}`}>
                  {job.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Time Period</label>
                <p>Start: {job.timePeriod.start}</p>
                <p>Due: {job.timePeriod.due}</p>
              </div>
              {job.schedule.start && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Schedule</label>
                  <p>{job.schedule.start}</p>
                  {job.schedule.duration && (
                    <p className="text-sm text-gray-500">Duration: {job.schedule.duration}</p>
                  )}
                </div>
              )}
              {job.cost && (
                <div>
                  <label className="block text-sm font-medium text-gray-500">Estimated Price</label>
                  <p className="text-xl font-semibold">${job.cost.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Act on this Job</h2>
            <div className="space-y-3">
              <button className="btn btn-primary w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Complete Job
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <Send className="h-4 w-4 mr-2" />
                Send Service Link
              </button>
              <button className="btn btn-success w-full justify-start">
                <FileInvoice className="h-4 w-4 mr-2" />
                Invoice Job
              </button>
              <button className="btn btn-error w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Cancel Job
              </button>
              <button className="btn btn-secondary w-full justify-start">
                <Copy className="h-4 w-4 mr-2" />
                Copy Job
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;