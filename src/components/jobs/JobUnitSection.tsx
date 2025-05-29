import { Link } from 'react-router-dom';
import { Building2, MapPin, Building, Tag, FileText } from 'lucide-react';
import { Job } from '../../types/job';

type JobUnitSectionProps = {
  job: Job;
};

const JobUnitSection = ({ job }: JobUnitSectionProps) => {
  if (!job.units) {
    return (
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Unit Information</h2>
        <p className="text-gray-500">No unit assigned to this job.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-medium mb-4">Unit Information</h2>
      
      <div className="space-y-6">
        {/* Unit Details */}
        <div>
          <div className="flex items-start gap-2 mb-4">
            <Building2 className="h-5 w-5 text-gray-400 mt-1" />
            <div>
              <Link 
                to={`/units/${job.unit_id}`}
                className="text-lg font-medium text-primary-600 hover:text-primary-800"
              >
                Unit {job.units.unit_number}
              </Link>
              <p className="text-sm text-gray-500">
                Status: <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  job.units.status === 'active' ? 'bg-success-100 text-success-800' : 'bg-error-100 text-error-800'
                }`}>
                  {job.units.status}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {(job.units.primary_contact_email || job.units.primary_contact_phone || job.units.primary_contact_type) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Contact Information</h3>
            
            {job.units.primary_contact_type && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">Primary Contact Type: {job.units.primary_contact_type}</p>
                </div>
              </div>
            )}
            
            {job.units.primary_contact_email && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">{job.units.primary_contact_email}</p>
                </div>
              </div>
            )}
            
            {job.units.primary_contact_phone && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">{job.units.primary_contact_phone}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Billing Information */}
        {(job.units.billing_entity || job.units.billing_email || job.units.billing_city) && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Billing Information</h3>
            
            {job.units.billing_entity && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">Billing Entity: {job.units.billing_entity}</p>
                </div>
              </div>
            )}
            
            {job.units.billing_email && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">{job.units.billing_email}</p>
                </div>
              </div>
            )}
            
            {(job.units.billing_city || job.units.billing_state || job.units.billing_zip) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">
                    {job.units.billing_city && `${job.units.billing_city}, `}
                    {job.units.billing_state && `${job.units.billing_state} `}
                    {job.units.billing_zip && job.units.billing_zip}
                  </p>
                </div>
              </div>
            )}
            
            {(job.units.taxable !== undefined || job.units.tax_group_name) && (
              <div className="flex items-start gap-2">
                <Tag className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm">
                    {job.units.taxable !== undefined && `Taxable: ${job.units.taxable ? 'Yes' : 'No'}`}
                    {job.units.tax_group_name && ` | Group: ${job.units.tax_group_name}`}
                    {job.units.tax_group_code && ` (${job.units.tax_group_code})`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Location and Company Navigation */}
        {job.locations && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2 mb-2">
              <Building className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <Link 
                  to={`/locations/${job.location_id}`}
                  className="text-primary-600 hover:text-primary-800 font-medium"
                >
                  {job.locations.name}
                </Link>
                <p className="text-sm text-gray-500">{job.locations.building_name}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="text-sm text-gray-600">{job.locations.address}</p>
                <p className="text-sm text-gray-600">
                  {job.locations.city}, {job.locations.state} {job.locations.zip}
                </p>
              </div>
            </div>
            
            {job.locations.companies && (
              <div className="mt-2">
                <Link 
                  to={`/companies/${job.locations.company_id}`}
                  className="text-primary-600 hover:text-primary-800"
                >
                  {job.locations.companies.name}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobUnitSection;