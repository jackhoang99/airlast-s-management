import React, { useState, useEffect } from "react";
import {
  Calendar,
  X,
  Send,
  User,
  Edit2,
  Check,
  X as XIcon,
} from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  jobData: {
    address: string;
    jobType: string;
    description: string;
    problemDescription: string;
    startDate: string;
    dueDate: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    unitInfo?: string;
    companyName?: string;
    locationName?: string;
  };
  selectedTechnicians: Array<{
    id: string;
    name: string;
    email: string;
    scheduledTime?: string;
  }>;
}

const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  jobData,
  selectedTechnicians,
}) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(
    new Set()
  );
  const [editingTechnicianEmail, setEditingTechnicianEmail] = useState<
    string | null
  >(null);
  const [tempTechnicianEmail, setTempTechnicianEmail] = useState("");

  // Default admin emails
  const [adminEmails, setAdminEmails] = useState([
    { name: "Charlie", email: "charlie@airlast.com", type: "admin" },
    { name: "Dillon", email: "dillon@airlast.com", type: "admin" },
    { name: "Brandy", email: "brandy@airlast.com", type: "admin" },
  ]);

  // Get technician emails from selected technicians
  const [technicianEmails, setTechnicianEmails] = useState<
    Array<{
      name: string;
      email: string;
      type: string;
      scheduledTime?: string;
    }>
  >([]);

  // Update technician emails when selectedTechnicians changes
  useEffect(() => {
    setTechnicianEmails(
      selectedTechnicians.map((tech) => ({
        name: tech.name,
        email: tech.email,
        type: "technician",
        scheduledTime: tech.scheduledTime,
      }))
    );
  }, [selectedTechnicians]);

  // Combine admin and technician emails
  const allEmails = [...adminEmails, ...technicianEmails];

  const handleEditEmail = (email: string) => {
    setEditingEmail(email);
    setTempEmail(email);
  };

  const handleSaveEmail = (oldEmail: string) => {
    if (tempEmail.trim()) {
      setAdminEmails((prev) =>
        prev.map((admin) =>
          admin.email === oldEmail
            ? { ...admin, email: tempEmail.trim() }
            : admin
        )
      );
    }
    setEditingEmail(null);
    setTempEmail("");
  };

  const handleCancelEdit = () => {
    setEditingEmail(null);
    setTempEmail("");
  };

  const handleEditTechnicianEmail = (email: string) => {
    setEditingTechnicianEmail(email);
    setTempTechnicianEmail(email);
  };

  const handleSaveTechnicianEmail = (oldEmail: string) => {
    if (tempTechnicianEmail.trim()) {
      setTechnicianEmails((prev) =>
        prev.map((tech) =>
          tech.email === oldEmail
            ? { ...tech, email: tempTechnicianEmail.trim() }
            : tech
        )
      );
    }
    setEditingTechnicianEmail(null);
    setTempTechnicianEmail("");
  };

  const handleCancelTechnicianEdit = () => {
    setEditingTechnicianEmail(null);
    setTempTechnicianEmail("");
  };

  const handleAttendeeToggle = (email: string) => {
    setSelectedAttendees((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allEmails = [...adminEmails, ...technicianEmails].map(
      (email) => email.email
    );
    setSelectedAttendees(new Set(allEmails));
  };

  const handleSelectNone = () => {
    setSelectedAttendees(new Set());
  };

  const generateGoogleCalendarUrl = () => {
    const eventTitle = `${jobData.address} - ${jobData.jobType}`;

    // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ format)
    const formatDateForGoogle = (dateString: string, timeString?: string) => {
      let date: Date;

      if (timeString) {
        // Use technician scheduled time if available
        const [hours, minutes] = timeString.split(":").map(Number);
        const [year, month, day] = dateString.split("-").map(Number);
        date = new Date(year, month - 1, day, hours, minutes);
      } else {
        // Use default date
        date = new Date(dateString);
      }

      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    // Find the primary technician's scheduled time
    const primaryTechnician = selectedTechnicians.find(
      (tech) => tech.scheduledTime
    );
    const scheduledTime = primaryTechnician?.scheduledTime;

    const startDateTime = formatDateForGoogle(jobData.startDate, scheduledTime);
    const endDateTime = formatDateForGoogle(jobData.dueDate, scheduledTime);

    // Create detailed description with technician times
    let description = `
Job Details:
- Company: ${jobData.companyName || "N/A"}
- Location: ${jobData.locationName || jobData.address}
- Unit: ${jobData.unitInfo || "N/A"}
- Description: ${jobData.description}
- Problem: ${jobData.problemDescription}
- Customer: ${jobData.contactName}
- Contact: ${jobData.contactPhone} | ${jobData.contactEmail}

Job Type: ${jobData.jobType}
Address: ${jobData.address}`;

    // Add technician schedule information
    if (selectedTechnicians.length > 0) {
      description += `\n\nAssigned Technicians:`;
      selectedTechnicians.forEach((tech) => {
        if (tech.scheduledTime) {
          const [hours, minutes] = tech.scheduledTime.split(":");
          const timeStr = new Date(
            2000,
            0,
            1,
            parseInt(hours),
            parseInt(minutes)
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          description += `\n- ${tech.name}: ${timeStr}`;
        } else {
          description += `\n- ${tech.name}: Time TBD`;
        }
      });
    }

    description = description.trim();

    const baseUrl = "https://calendar.google.com/calendar/render";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventTitle,
      dates: `${startDateTime}/${endDateTime}`,
      details: description,
      location: jobData.address,
    });

    // Only add selected attendees
    if (selectedAttendees.size > 0) {
      const attendees = Array.from(selectedAttendees).join(",");
      params.set("add", attendees);
    }

    return `${baseUrl}?${params.toString()}`;
  };

  const handleSendToCalendar = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare data for the edge function
      const eventData = {
        jobData,
        selectedTechnicians,
        selectedAttendees: Array.from(selectedAttendees),
        adminEmails,
      };

      // Call the edge function to create the calendar event
      const response = await supabase.functions.invoke(
        "send-google-calendar-invite",
        {
          body: eventData,
        }
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        // Show success message
        alert(
          `Google Calendar event created successfully! Event ID: ${response.data.eventId}`
        );

        // Call the onConfirm callback to proceed with job creation
        onConfirm();
      } else {
        throw new Error(
          response.data?.error || "Failed to create calendar event"
        );
      }
    } catch (err) {
      console.error("Error creating calendar event:", err);
      setError(`Failed to create calendar event: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-semibold">Send to Google Calendar</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Event Details */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>
                <strong>Title:</strong> {jobData.address} - {jobData.jobType}
              </div>
              <div>
                <strong>Date:</strong> {jobData.startDate} to {jobData.dueDate}
              </div>
              <div>
                <strong>Location:</strong> {jobData.address}
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Attendees</h4>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleSelectNone}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Select None
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Admin Emails */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">
                  Admin Team
                </h5>
                <div className="space-y-2">
                  {adminEmails.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttendees.has(email.email)}
                        onChange={() => handleAttendeeToggle(email.email)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{email.name}</span>
                      <span className="text-gray-500">
                        {editingEmail === email.email ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="email"
                              value={tempEmail}
                              onChange={(e) => setTempEmail(e.target.value)}
                              className="text-xs px-2 py-1 border rounded"
                              size={20}
                            />
                            <button
                              onClick={() => handleSaveEmail(email.email)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1">
                            ({email.email})
                            <button
                              onClick={() => handleEditEmail(email.email)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assigned Technicians */}
              {technicianEmails.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                    Assigned Technicians
                  </h5>
                  <div className="space-y-2">
                    {technicianEmails.map((tech, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAttendees.has(tech.email)}
                          onChange={() => handleAttendeeToggle(tech.email)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <User className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{tech.name}</span>
                        <span className="text-gray-500">
                          {editingTechnicianEmail === tech.email ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="email"
                                value={tempTechnicianEmail}
                                onChange={(e) =>
                                  setTempTechnicianEmail(e.target.value)
                                }
                                className="text-xs px-2 py-1 border rounded"
                                size={20}
                              />
                              <button
                                onClick={() =>
                                  handleSaveTechnicianEmail(tech.email)
                                }
                                className="text-green-600 hover:text-green-800"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={handleCancelTechnicianEdit}
                                className="text-red-600 hover:text-red-800"
                              >
                                <XIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1">
                              ({tech.email})
                              <button
                                onClick={() =>
                                  handleEditTechnicianEmail(tech.email)
                                }
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </span>
                          )}
                        </span>
                        {tech.scheduledTime && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            {(() => {
                              const [hours, minutes] =
                                tech.scheduledTime.split(":");
                              return new Date(
                                2000,
                                0,
                                1,
                                parseInt(hours),
                                parseInt(minutes)
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              });
                            })()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Event Notes</h4>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              <div>
                <strong>Company:</strong> {jobData.companyName || "N/A"}
              </div>
              <div>
                <strong>Location:</strong>{" "}
                {jobData.locationName || jobData.address}
              </div>
              <div>
                <strong>Unit:</strong> {jobData.unitInfo || "N/A"}
              </div>
              <div>
                <strong>Description:</strong> {jobData.description}
              </div>
              <div>
                <strong>Problem:</strong> {jobData.problemDescription}
              </div>
              <div>
                <strong>Customer:</strong> {jobData.contactName}
              </div>
              <div>
                <strong>Contact:</strong> {jobData.contactPhone} |{" "}
                {jobData.contactEmail}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSendToCalendar}
            className="btn btn-primary flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                Creating Event...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create Calendar Event
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarModal;
