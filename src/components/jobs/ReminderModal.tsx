import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import {
  Bell,
  Mail,
  MessageSquare,
  User,
  Calendar,
  Clock,
  X,
  Send,
  AlertTriangle,
} from "lucide-react";

type ReminderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  jobId?: string; // Made optional to support admin reminders
  jobTechnicians?: {
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
  onReminderSent?: () => void;
};

type User = Database["public"]["Tables"]["users"]["Row"];

const ReminderModal = ({
  isOpen,
  onClose,
  jobId,
  jobTechnicians,
  onReminderSent,
}: ReminderModalProps) => {
  const { supabase } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [reminderType, setReminderType] = useState<"email" | "in_app">("email");
  const [recipientType, setRecipientType] = useState<
    "technician" | "admin" | "custom"
  >("technician");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [customRecipient, setCustomRecipient] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [sendImmediately, setSendImmediately] = useState<boolean>(true);

  // Available technicians
  const [availableTechnicians, setAvailableTechnicians] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchTechnicians();
      resetForm();
    }
  }, [isOpen]);

  const fetchTechnicians = async () => {
    if (!supabase) return;

    try {
      let techData: any[] = [];

      if (jobTechnicians && jobTechnicians.length > 0) {
        const technicianIds = jobTechnicians.map((jt) => jt.technician_id);
        const { data: assignedTechData, error: assignedTechError } =
          await supabase
            .from("users")
            .select("id, first_name, last_name, email, phone, role")
            .in("id", technicianIds)
            .eq("role", "technician")
            .eq("status", "active")
            .order("first_name");

        if (assignedTechError) {
          console.error(
            "Error fetching assigned technicians:",
            assignedTechError
          );
        } else if (assignedTechData) {
          techData = assignedTechData;
        }
      } else if (!jobId) {
        // For admin reminders, fetch all active technicians
        const { data: allTechData, error: allTechError } = await supabase
          .from("users")
          .select("id, first_name, last_name, email, phone, role")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");

        if (allTechError) {
          console.error("Error fetching all technicians:", allTechError);
        } else if (allTechData) {
          techData = allTechData;
        }
      }

      setAvailableTechnicians(techData);
    } catch (err) {
      console.error("Error fetching technicians:", err);
    }
  };

  const resetForm = () => {
    setReminderType("email");
    setRecipientType("technician");
    setSelectedTechnician("");
    setCustomRecipient("");
    setSubject("");
    setMessage("");
    setScheduledFor("");
    setSendImmediately(true);
    setError(null);
    setSuccess(null);
    setEditableEmail("");
    setShowEmailEdit(false);
  };

  const getDefaultSubject = () => {
    switch (reminderType) {
      case "email":
        return jobId ? "Job Reminder" : "Admin Reminder";
      case "in_app":
        return "In-App Notification";
      default:
        return "";
    }
  };

  const getDefaultMessage = () => {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    switch (reminderType) {
      case "email":
        return jobId
          ? `This is a reminder about your upcoming job. Please ensure you are prepared and on time.`
          : `This is an admin reminder. Please check your dashboard for important updates.`;
      case "in_app":
        return jobId
          ? `You have a job reminder. Please check your schedule.`
          : `You have an admin reminder. Please check your dashboard.`;
      default:
        return "";
    }
  };

  const handleReminderTypeChange = (type: "email" | "in_app") => {
    setReminderType(type);
    setSubject(getDefaultSubject());
    setMessage(getDefaultMessage());

    // For in-app reminders, automatically switch to technician
    if (type === "in_app") {
      setRecipientType("technician");
    }
  };

  // Auto-update fields when reminder type changes
  useEffect(() => {
    setSubject(getDefaultSubject());
    setMessage(getDefaultMessage());
  }, [reminderType]);

  const handleRecipientTypeChange = (
    type: "technician" | "admin" | "custom"
  ) => {
    setRecipientType(type);
    setSelectedTechnician("");
    setCustomRecipient("");
  };

  const [editableEmail, setEditableEmail] = useState<string>("");
  const [showEmailEdit, setShowEmailEdit] = useState<boolean>(false);

  const getRecipientEmail = () => {
    if (recipientType === "technician" && selectedTechnician) {
      if (showEmailEdit && editableEmail) {
        return editableEmail;
      }
      const tech = availableTechnicians.find(
        (t) => t.id === selectedTechnician
      );
      return tech?.email || "";
    } else if (recipientType === "custom") {
      return customRecipient;
    }
    return "";
  };

  const getRecipientId = () => {
    if (recipientType === "technician" && selectedTechnician) {
      return selectedTechnician;
    } else if (recipientType === "admin") {
      return "admin"; // Special identifier for admin reminders
    }
    return null;
  };

  // Update editable email when technician selection changes
  useEffect(() => {
    if (recipientType === "technician" && selectedTechnician) {
      const tech = availableTechnicians.find(
        (t) => t.id === selectedTechnician
      );
      setEditableEmail(tech?.email || "");
      setShowEmailEdit(false);
    }
  }, [selectedTechnician, recipientType, availableTechnicians]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const recipient = getRecipientEmail();
      const recipientId = getRecipientId();

      if (reminderType === "in_app") {
        if (!recipientId) {
          throw new Error("Please select a recipient for in-app reminder");
        }
      } else {
        if (!recipient) {
          throw new Error("Please select a recipient or enter a custom email");
        }
      }

      if (!subject.trim()) {
        throw new Error("Please enter a subject");
      }

      if (!message.trim()) {
        throw new Error("Please enter a message");
      }

      // Determine when to send the reminder
      const scheduledForTime = sendImmediately
        ? new Date().toISOString()
        : new Date(scheduledFor).toISOString();

      // For in-app reminders, use user ID; for email reminders, use email
      const recipientValue =
        reminderType === "in_app" ? getRecipientId() : recipient;

      // Create the reminder record
      const { data: insertData, error: insertError } = await supabase
        .from("job_reminders")
        .insert({
          job_id: jobId || null, // Use null for admin reminders
          reminder_type: reminderType,
          recipient: recipientValue,
          subject: subject,
          message: message,
          scheduled_for: scheduledForTime,
          status: sendImmediately ? "sent" : "pending",
          sent_at: sendImmediately ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // If sending immediately, send it via edge function
      if (sendImmediately) {
        try {
          const response = await fetch(
            `${
              import.meta.env.VITE_SUPABASE_URL
            }/functions/v1/send-manual-reminder`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${
                  import.meta.env.VITE_SUPABASE_ANON_KEY
                }`,
              },
              body: JSON.stringify({
                reminderId: insertData.id,
                recipient: recipientValue,
                subject: subject,
                message: message,
                reminderType: reminderType,
                jobId: jobId || null,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error sending email:", errorData);

            // Update reminder status to failed
            await supabase
              .from("job_reminders")
              .update({
                status: "failed",
                error_message:
                  errorData.error || `Failed to send ${reminderType} reminder`,
              })
              .eq("id", insertData.id);

            throw new Error(`Failed to send ${reminderType} reminder`);
          }

          console.log(`${reminderType} reminder sent successfully`);
        } catch (reminderError) {
          console.error(
            `Error sending ${reminderType} reminder:`,
            reminderError
          );
          throw new Error(`Failed to send ${reminderType} reminder`);
        }
      }

      setSuccess(
        sendImmediately
          ? `${
              reminderType === "email" ? "Email" : "In-app notification"
            } reminder sent successfully!`
          : "Reminder scheduled successfully!"
      );

      // Call the callback to refresh the reminder list
      if (onReminderSent) {
        onReminderSent();
      }

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Error sending reminder:", err);
      setError(err.message || "Failed to send reminder");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary-600" />
            {jobId ? "Send Reminder" : "Send Admin Reminder"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error-50 border border-error-200 rounded-md p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-error-500 mr-2" />
                <p className="text-error-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-success-50 border border-success-200 rounded-md p-3">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-success-500 mr-2" />
                <p className="text-success-700">{success}</p>
              </div>
            </div>
          )}

          {/* Reminder Type */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reminder Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleReminderTypeChange("email")}
                className={`p-3 border rounded-lg flex flex-col items-center ${
                  reminderType === "email"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Mail className="h-5 w-5 mb-1" />
                <span className="text-sm">Email</span>
              </button>
              <button
                type="button"
                onClick={() => handleReminderTypeChange("in_app")}
                className={`p-3 border rounded-lg flex flex-col items-center ${
                  reminderType === "in_app"
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <MessageSquare className="h-5 w-5 mb-1" />
                <span className="text-sm">In-App</span>
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium mb-2">Recipient</label>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="technician"
                    checked={recipientType === "technician"}
                    onChange={(e) =>
                      handleRecipientTypeChange(e.target.value as any)
                    }
                    className="mr-2"
                  />
                  <User className="h-4 w-4 mr-1" />
                  Technician
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    value="admin"
                    checked={recipientType === "admin"}
                    onChange={(e) =>
                      handleRecipientTypeChange(e.target.value as any)
                    }
                    className="mr-2"
                    disabled={reminderType !== "in_app"}
                  />
                  <User className="h-4 w-4 mr-1" />
                  Admin
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    value="custom"
                    checked={recipientType === "custom"}
                    onChange={(e) =>
                      handleRecipientTypeChange(e.target.value as any)
                    }
                    className="mr-2"
                    disabled={reminderType === "in_app"}
                  />
                  <User className="h-4 w-4 mr-1" />
                  Custom Email
                </label>
              </div>

              {reminderType === "in_app" && (
                <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-md mt-2">
                  In-app reminders are available for technicians and admins.
                </div>
              )}

              {recipientType === "technician" && (
                <div className="space-y-3">
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    className="input w-full"
                    required
                  >
                    <option value="">Select Technician</option>
                    {availableTechnicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.first_name} {tech.last_name} ({tech.email})
                      </option>
                    ))}
                  </select>

                  {selectedTechnician && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowEmailEdit(!showEmailEdit)}
                          className="text-sm text-primary-600 hover:text-primary-800"
                        >
                          {showEmailEdit ? "Use Default" : "Edit Email"}
                        </button>
                      </div>

                      {showEmailEdit ? (
                        <input
                          type="email"
                          value={editableEmail}
                          onChange={(e) => setEditableEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="input w-full"
                          required
                        />
                      ) : (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                          {editableEmail || "No email available"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {recipientType === "admin" && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  Admin reminders will be displayed in the admin dashboard.
                </div>
              )}

              {recipientType === "custom" && (
                <input
                  type="email"
                  value={customRecipient}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  placeholder="Enter email address"
                  className="input w-full"
                  required
                />
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject"
              className="input w-full"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message"
              rows={4}
              className="input w-full"
              required
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium mb-2">
              When to Send
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={sendImmediately}
                  onChange={() => setSendImmediately(true)}
                  className="mr-2"
                />
                <Clock className="h-4 w-4 mr-1" />
                Send immediately
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!sendImmediately}
                  onChange={() => setSendImmediately(false)}
                  className="mr-2"
                />
                <Calendar className="h-4 w-4 mr-1" />
                Schedule for later
              </label>

              {!sendImmediately && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="input w-full"
                  required
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReminderModal;
