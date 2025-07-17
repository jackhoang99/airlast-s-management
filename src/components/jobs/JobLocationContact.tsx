import { Building, MapPin, User, Phone, Mail } from "lucide-react";
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
                        {/* Asset info will be injected here */}
                        <UnitAssetLink unitId={u.id} />
                        {idx < job.units.length - 1 && ", "}
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

function UnitAssetLink({ unitId }: { unitId: string }) {
  const [asset, setAsset] = useState<any | null>(undefined);
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/unit-assets-latest?unitId=${unitId}`);
      if (res.ok) {
        const data = await res.json();
        setAsset(data.asset || null);
      } else {
        setAsset(null);
      }
    })();
  }, [unitId]);
  if (asset === undefined || asset === null) return null;
  return (
    <Link
      to={`/assets/${asset.id}`}
      className="ml-1 text-xs text-primary-600 hover:text-primary-800"
    >
      (View Asset)
    </Link>
  );
}
