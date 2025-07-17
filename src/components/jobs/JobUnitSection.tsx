import { Link } from "react-router-dom";
import { Building2, MapPin, FileText, Mail, Phone } from "lucide-react";
import { Job } from "../../types/job";

type JobUnitSectionProps = {
  job: Job;
};

function getSharedValue(units: any[], field: string) {
  if (units.length === 0) return undefined;
  const first = units[0][field];
  return units.every((u) => u[field] === first) ? first : undefined;
}

const JobUnitSection = ({ job }: JobUnitSectionProps) => {
  if (!job.units || job.units.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-medium mb-4">Unit Information</h2>
        <p className="text-gray-500">No unit assigned to this job.</p>
      </div>
    );
  }

  const units = job.units;

  // Find shared fields
  const sharedContactType = getSharedValue(units, "primary_contact_type");
  const sharedContactEmail = getSharedValue(units, "primary_contact_email");
  const sharedContactPhone = getSharedValue(units, "primary_contact_phone");
  const sharedBillingEntity = getSharedValue(units, "billing_entity");
  const sharedBillingEmail = getSharedValue(units, "billing_email");
  const sharedBillingCity = getSharedValue(units, "billing_city");
  const sharedBillingState = getSharedValue(units, "billing_state");
  const sharedBillingZip = getSharedValue(units, "billing_zip");
  const sharedOffice = getSharedValue(units, "office");

  // Check if any unit has unique info
  const anyUnitHasUniqueInfo = units.some((unit: any) => {
    return (
      (!sharedContactType && unit.primary_contact_type) ||
      (!sharedContactEmail && unit.primary_contact_email) ||
      (!sharedContactPhone && unit.primary_contact_phone) ||
      (!sharedBillingEntity && unit.billing_entity) ||
      (!sharedBillingEmail && unit.billing_email) ||
      (!sharedBillingCity && unit.billing_city) ||
      (!sharedBillingState && unit.billing_state) ||
      (!sharedBillingZip && unit.billing_zip) ||
      (!sharedOffice && unit.office)
    );
  });

  return (
    <div className="card">
      <h2 className="text-lg font-medium mb-6">Unit Information</h2>
      {/* Shared Info */}
      <div
        className="bg-gray-50 rounded-lg p-5 mb-6 border border-gray-200"
        aria-label="Shared Unit Details"
      >
        <h3 className="text-base font-semibold mb-3 text-gray-700">
          Shared Unit Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(sharedContactType || sharedContactEmail || sharedContactPhone) && (
            <div>
              <div className="font-semibold text-gray-800 mb-2">
                Contact Information
              </div>
              <div className="space-y-1 ml-1">
                {sharedContactType && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>Primary Contact Type: {sharedContactType}</span>
                  </div>
                )}
                {sharedContactEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${sharedContactEmail}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {sharedContactEmail}
                    </a>
                  </div>
                )}
                {sharedContactPhone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a
                      href={`tel:${sharedContactPhone}`}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      {sharedContactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          {(sharedBillingEntity ||
            sharedBillingEmail ||
            sharedBillingCity ||
            sharedBillingState ||
            sharedBillingZip) && (
            <div>
              <div className="font-semibold text-gray-800 mb-2">
                Billing Information
              </div>
              <div className="space-y-1 ml-1">
                {sharedBillingEntity && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>Billing Entity: {sharedBillingEntity}</span>
                  </div>
                )}
                {sharedBillingEmail && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{sharedBillingEmail}</span>
                  </div>
                )}
                {(sharedBillingCity ||
                  sharedBillingState ||
                  sharedBillingZip) && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>
                      {[sharedBillingCity, sharedBillingState, sharedBillingZip]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {sharedOffice && (
            <div>
              <div className="font-semibold text-gray-800 mb-1">Office</div>
              <div className="ml-1 text-gray-700">{sharedOffice}</div>
            </div>
          )}
        </div>
      </div>
      <hr className="my-6" />
      {/* Per-unit Info */}
      <div className="space-y-6">
        {units.map((unit: any, idx: number) => {
          // Only show fields that are unique for this unit
          const uniqueContactType = sharedContactType
            ? undefined
            : unit.primary_contact_type;
          const uniqueContactEmail = sharedContactEmail
            ? undefined
            : unit.primary_contact_email;
          const uniqueContactPhone = sharedContactPhone
            ? undefined
            : unit.primary_contact_phone;
          const uniqueBillingEntity = sharedBillingEntity
            ? undefined
            : unit.billing_entity;
          const uniqueBillingEmail = sharedBillingEmail
            ? undefined
            : unit.billing_email;
          const uniqueBillingCity = sharedBillingCity
            ? undefined
            : unit.billing_city;
          const uniqueBillingState = sharedBillingState
            ? undefined
            : unit.billing_state;
          const uniqueBillingZip = sharedBillingZip
            ? undefined
            : unit.billing_zip;
          const uniqueOffice = sharedOffice ? undefined : unit.office;

          const hasUniqueInfo =
            uniqueContactType ||
            uniqueContactEmail ||
            uniqueContactPhone ||
            uniqueBillingEntity ||
            uniqueBillingEmail ||
            uniqueBillingCity ||
            uniqueBillingState ||
            uniqueBillingZip ||
            uniqueOffice;

          return (
            <div
              key={unit.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-2 shadow-sm"
              aria-label={`Unit ${unit.unit_number} Details`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-gray-400" />
                <Link
                  to={`/units/${unit.id}`}
                  className="text-lg font-semibold text-primary-600 hover:text-primary-800"
                >
                  {unit.unit_number}
                </Link>
                <span
                  className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    unit.status === "active"
                      ? "bg-success-100 text-success-800"
                      : "bg-error-100 text-error-800"
                  }`}
                >
                  {unit.status}
                </span>
              </div>
              {hasUniqueInfo ? (
                <div className="space-y-2 mt-2">
                  {(uniqueContactType ||
                    uniqueContactEmail ||
                    uniqueContactPhone) && (
                    <div>
                      <div className="font-semibold text-gray-800 mb-1 text-sm">
                        Contact Information
                      </div>
                      <div className="space-y-1 ml-1">
                        {uniqueContactType && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span>
                              Primary Contact Type: {uniqueContactType}
                            </span>
                          </div>
                        )}
                        {uniqueContactEmail && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a
                              href={`mailto:${uniqueContactEmail}`}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              {uniqueContactEmail}
                            </a>
                          </div>
                        )}
                        {uniqueContactPhone && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <a
                              href={`tel:${uniqueContactPhone}`}
                              className="text-primary-600 hover:text-primary-800"
                            >
                              {uniqueContactPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(uniqueBillingEntity ||
                    uniqueBillingEmail ||
                    uniqueBillingCity ||
                    uniqueBillingState ||
                    uniqueBillingZip) && (
                    <div>
                      <div className="font-semibold text-gray-800 mb-1 text-sm">
                        Billing Information
                      </div>
                      <div className="space-y-1 ml-1">
                        {uniqueBillingEntity && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span>Billing Entity: {uniqueBillingEntity}</span>
                          </div>
                        )}
                        {uniqueBillingEmail && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span>{uniqueBillingEmail}</span>
                          </div>
                        )}
                        {(uniqueBillingCity ||
                          uniqueBillingState ||
                          uniqueBillingZip) && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>
                              {[
                                uniqueBillingCity,
                                uniqueBillingState,
                                uniqueBillingZip,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {uniqueOffice && (
                    <div>
                      <div className="font-semibold text-gray-800 mb-1 text-sm">
                        Office
                      </div>
                      <div className="ml-1 text-gray-700">{uniqueOffice}</div>
                    </div>
                  )}
                </div>
              ) : (
                units.length > 1 && (
                  <div className="text-gray-400 text-sm italic">
                    All details are shared across units.
                  </div>
                )
              )}
              {idx !== units.length - 1 && <hr className="my-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobUnitSection;
