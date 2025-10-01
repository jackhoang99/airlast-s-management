import { Building, MapPin, User, Phone, Mail, FileText } from "lucide-react";
import { Job } from "../../types/job";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

type JobLocationContactProps = {
  job: Job;
};

const JobLocationContact = ({ job }: JobLocationContactProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Location</h3>
        {job.locations ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Building className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">
                  <Link
                    to={`/companies/${
                      job.locations.company_id || job.locations.companies?.id
                    }`}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {job.locations.companies.name}
                  </Link>
                </p>
                <p>
                  <Link
                    to={`/locations/${job.locations.id}`}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    {job.locations.name}
                  </Link>
                </p>
                {job.units && job.units.length > 0 ? (
                  <div>
                    Unit{job.units.length > 1 ? "s" : ""}:{" "}
                    {job.units.map((u: any, idx: number) => (
                      <span key={u.id}>
                        <Link
                          to={`/units/${u.id}`}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {u.unit_number}
                        </Link>
                        {idx < job.units!.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No unit assigned</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p>{job.locations.address}</p>
                <p>
                  {job.locations.city}, {job.locations.state}{" "}
                  {job.locations.zip}
                </p>
              </div>
            </div>

            {/* Location Billing Information */}
            {(job.locations?.billing_entity ||
              job.locations?.billing_email ||
              job.locations?.billing_city ||
              job.locations?.billing_state ||
              job.locations?.billing_zip ||
              job.locations?.office) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Location Billing Information
                </h4>
                <div className="space-y-2 text-sm">
                  {job.locations?.billing_entity && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20">Entity:</span>
                      <span>{job.locations.billing_entity}</span>
                    </div>
                  )}
                  {job.locations?.billing_email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20">Email:</span>
                      <a
                        href={`mailto:${job.locations.billing_email}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.locations.billing_email}
                      </a>
                    </div>
                  )}
                  {(job.locations?.billing_city ||
                    job.locations?.billing_state ||
                    job.locations?.billing_zip) && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20">Address:</span>
                      <span>
                        {[
                          job.locations?.billing_city,
                          job.locations?.billing_state,
                          job.locations?.billing_zip,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {job.locations?.office && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 w-20">Office:</span>
                      <span>{job.locations.office}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No location assigned</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Contact</h3>
        {job.contact_name ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">{job.contact_name}</p>
                {job.contact_type && (
                  <p className="text-sm text-gray-500 capitalize">
                    {job.contact_type} Contact
                  </p>
                )}
              </div>
            </div>
            {job.contact_phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-gray-400 mt-1" />
                <a
                  href={`tel:${job.contact_phone}`}
                  className="text-primary-600 hover:text-primary-800"
                >
                  {job.contact_phone}
                </a>
              </div>
            )}
            {job.contact_email && (
              <div className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-gray-400 mt-1" />
                <a
                  href={`mailto:${job.contact_email}`}
                  className="text-primary-600 hover:text-primary-800"
                >
                  {job.contact_email}
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">No contact information</p>
        )}
      </div>
    </div>
  );
};

export default JobLocationContact;
