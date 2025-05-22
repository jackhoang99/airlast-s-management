import React from 'react';
import { Database } from '../../types/supabase';

type Job = Database['public']['Tables']['jobs']['Row'] & {
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    companies: {
      name: string;
    };
  };
  units?: {
    unit_number: string;
  };
  job_technicians?: {
    id: string;
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  }[];
};

type JobItem = Database['public']['Tables']['job_items']['Row'];

interface QuotePDFTemplateProps {
  job: Job;
  jobItems: JobItem[];
}

const QuotePDFTemplate: React.FC<QuotePDFTemplateProps> = ({ job, jobItems }) => {
  const calculateTotalCost = () => {
    return jobItems.reduce((total, item) => total + Number(item.total_cost), 0);
  };

  // Get current date in MM/DD/YYYY format
  const getCurrentDate = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const year = today.getFullYear();
    return `${month}/${day}/${year}`;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold">Airlast HVAC</h1>
          <p>1650 Marietta Boulevard Northwest</p>
          <p>Atlanta, GA 30318</p>
          <p>(404) 632-9074</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold">Quote</h2>
          <p>Job #: {job.number}</p>
          <p>Date: {new Date().toLocaleDateString()}</p>
          <p>Valid Until: {new Date(new Date().setDate(new Date().getDate() + 30)).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Customer Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold">Bill To:</p>
            <p>{job.locations?.companies.name}</p>
            <p>{job.locations?.address}</p>
            <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
          </div>
          <div>
            <p className="font-bold">Contact:</p>
            <p>{job.contact_name}</p>
            <p>{job.contact_phone}</p>
            <p>{job.contact_email}</p>
          </div>
        </div>
      </div>

      {/* Service Location */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Service Location</h3>
        <p>{job.locations?.name}</p>
        <p>{job.locations?.address}</p>
        <p>{job.locations?.city}, {job.locations?.state} {job.locations?.zip}</p>
        {job.units && <p>Unit: {job.units.unit_number}</p>}
      </div>

      {/* Service Details */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Service Details</h3>
        <p><strong>Service Type:</strong> {job.type}</p>
        <p><strong>Service Line:</strong> {job.service_line}</p>
        <p><strong>Description:</strong> {job.description}</p>
        {job.problem_description && (
          <p><strong>Problem Description:</strong> {job.problem_description}</p>
        )}
        {job.schedule_date && (
          <p><strong>Scheduled Date:</strong> {job.schedule_date}</p>
        )}
        {job.schedule_time && (
          <p><strong>Scheduled Time:</strong> {job.schedule_time}</p>
        )}
      </div>

      {/* Technicians */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Technicians</h3>
        {job.job_technicians && job.job_technicians.length > 0 ? (
          <ul>
            {job.job_technicians.map(tech => (
              <li key={tech.id}>
                {tech.users.first_name} {tech.users.last_name}
                {tech.is_primary && " (Primary)"}
              </li>
            ))}
          </ul>
        ) : (
          <p>No technicians assigned</p>
        )}
      </div>

      {/* Items & Pricing */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Items & Pricing</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Item</th>
              <th className="border p-2 text-right">Quantity</th>
              <th className="border p-2 text-right">Unit Price</th>
              <th className="border p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {jobItems.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-2 capitalize">{item.type}</td>
                <td className="border p-2">{item.name}</td>
                <td className="border p-2 text-right">{item.quantity}</td>
                <td className="border p-2 text-right">${Number(item.unit_cost).toFixed(2)}</td>
                <td className="border p-2 text-right">${Number(item.total_cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td className="border p-2" colSpan={4} align="right">Total:</td>
              <td className="border p-2 text-right">${calculateTotalCost().toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Terms & Conditions */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2">Terms & Conditions</h3>
        <p>1. This quote is valid for 30 days from the date of issue.</p>
        <p>2. Payment is due upon completion of work unless otherwise specified.</p>
        <p>3. Any additional work not specified in this quote will require a separate quote.</p>
      </div>

      {/* Airlast Signature */}
      <div className="mt-12 border-t pt-4">
        <div className="flex justify-end">
          <div>
            <p className="font-bold">Airlast HVAC:</p>
            <div className="mt-4 border-b border-black flex items-end justify-center" style={{ height: '1px', width: '200px' }}>
              <span className="text-xl relative" style={{ top: '10px', fontFamily: 'cursive, Brush Script MT, Brush Script Std, Lucida Calligraphy, Lucida Handwriting, Apple Chancery, URW Chancery L, Comic Sans MS' }}>Airlast</span>
            </div>
            <p className="mt-1">Representative</p>
            <div className="mt-4 border-b border-black flex items-end justify-center" style={{ height: '1px', width: '200px' }}>
              <span className="relative" style={{ top: '10px' }}>{getCurrentDate()}</span>
            </div>
            <p className="mt-1">Date</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotePDFTemplate;