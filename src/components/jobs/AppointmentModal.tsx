import { useState, useEffect } from "react";
import { X, Users, Check, Calendar, Clock } from "lucide-react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];

type AppointmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: {
    technicianIds: string[];
    technicianSchedules: {
      technicianId: string;
      scheduleDate: string;
      scheduleTime: string;
    }[];
  }) => void;
  selectedTechnicianIds?: string[];
  jobId?: string;
};

const AppointmentModal = ({
  isOpen,
  onClose,
  onSave,
  selectedTechnicianIds = [],
  jobId,
}: AppointmentModalProps) => {
  const { supabase } = useSupabase();
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>(
    selectedTechnicianIds
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [technicianSchedules, setTechnicianSchedules] = useState<{
    [technicianId: string]: { scheduleDate: string; scheduleTime: string };
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!supabase) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("role", "technician")
          .eq("status", "active")
          .order("first_name");

        if (error) throw error;
        console.log("Fetched technicians:", data);
        setTechnicians(data || []);
      } catch (err) {
        console.error("Error fetching technicians:", err);
        setError("Failed to load technicians");
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchTechnicians();
    }
  }, [supabase, isOpen]);

  // Function to fetch existing scheduled times for technicians
  const fetchExistingSchedules = async () => {
    if (!supabase || !jobId) return;

    try {
      const { data: existingSchedules, error } = await supabase
        .from("job_technicians")
        .select("technician_id, scheduled_at")
        .eq("job_id", jobId);

      if (error) throw error;

      const schedules: {
        [technicianId: string]: { scheduleDate: string; scheduleTime: string };
      } = {};

      existingSchedules?.forEach((schedule) => {
        if (schedule.scheduled_at) {
          const scheduledDate = new Date(schedule.scheduled_at);
          const scheduleDate = scheduledDate.toISOString().split("T")[0];

          // Convert to 24-hour format for the time input (HH:MM)
          const hours = scheduledDate.getHours();
          const minutes = scheduledDate.getMinutes();
          const scheduleTime = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;

          schedules[schedule.technician_id] = {
            scheduleDate,
            scheduleTime,
          };
        }
      });

      return schedules;
    } catch (err) {
      console.error("Error fetching existing schedules:", err);
      return {};
    }
  };

  useEffect(() => {
    const initializeSchedules = async () => {
      // Update selected techs when selectedTechnicianIds prop changes
      setSelectedTechs(selectedTechnicianIds);

      // Get existing schedules for technicians already assigned to this job
      const existingSchedules = await fetchExistingSchedules();

      // Initialize schedules for newly selected technicians
      const now = new Date();
      const currentDate = now.toISOString().split("T")[0];
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}`; // Format as HH:MM

      setTechnicianSchedules((prev) => {
        const updated = { ...prev };
        selectedTechnicianIds.forEach((techId) => {
          if (!updated[techId]) {
            // Use existing schedule if available, otherwise use current time
            updated[techId] = existingSchedules[techId] || {
              scheduleDate: currentDate,
              scheduleTime: currentTime,
            };
          }
        });
        return updated;
      });
    };

    if (isOpen) {
      initializeSchedules();
    }
  }, [selectedTechnicianIds, jobId, isOpen]);

  const handleTechnicianToggle = (techId: string) => {
    setSelectedTechs((prev) => {
      if (prev.includes(techId)) {
        // Remove technician and their schedule
        setTechnicianSchedules((prevSchedules) => {
          const updated = { ...prevSchedules };
          delete updated[techId];
          return updated;
        });
        return prev.filter((id) => id !== techId);
      } else {
        // Add technician with current date and time
        const now = new Date();
        const currentDate = now.toISOString().split("T")[0];
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`; // Format as HH:MM
        setTechnicianSchedules((prevSchedules) => ({
          ...prevSchedules,
          [techId]: { scheduleDate: currentDate, scheduleTime: currentTime },
        }));
        return [...prev, techId];
      }
    });
  };

  const handleScheduleChange = (
    technicianId: string,
    field: "scheduleDate" | "scheduleTime",
    value: string
  ) => {
    setTechnicianSchedules((prev) => ({
      ...prev,
      [technicianId]: {
        ...prev[technicianId],
        [field]: value,
      },
    }));
  };

  const setAllSameTime = () => {
    if (selectedTechs.length === 0) return;

    const firstTechId = selectedTechs[0];
    const firstSchedule = technicianSchedules[firstTechId];

    if (!firstSchedule) return;

    const updatedSchedules = { ...technicianSchedules };
    selectedTechs.forEach((techId) => {
      updatedSchedules[techId] = {
        scheduleDate: firstSchedule.scheduleDate,
        scheduleTime: firstSchedule.scheduleTime,
      };
    });

    setTechnicianSchedules(updatedSchedules);
  };

  const areSchedulesDifferent = () => {
    if (selectedTechs.length <= 1) return false;

    const schedules = selectedTechs.map(
      (techId) => technicianSchedules[techId]
    );
    const firstSchedule = schedules[0];

    // Check if firstSchedule exists and has required properties
    if (
      !firstSchedule ||
      !firstSchedule.scheduleDate ||
      !firstSchedule.scheduleTime
    ) {
      return false;
    }

    return schedules.some(
      (schedule) =>
        !schedule ||
        !schedule.scheduleDate ||
        !schedule.scheduleTime ||
        schedule.scheduleDate !== firstSchedule.scheduleDate ||
        schedule.scheduleTime !== firstSchedule.scheduleTime
    );
  };

  const filteredTechnicians = technicians.filter((tech) => {
    const firstName = tech.first_name || "";
    const lastName = tech.last_name || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    return searchTerm === "" || fullName.includes(searchTerm.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Assign Technicians</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Users size={16} />
                Select Technicians
              </div>
            </label>
            <input
              type="text"
              placeholder="Search technicians..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input mb-4"
            />

            {error && (
              <div className="bg-error-50 text-error-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto border rounded-md">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredTechnicians.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No technicians found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTechnicians.map((tech) => (
                    <div
                      key={tech.id}
                      className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                        selectedTechs.includes(tech.id) ? "bg-primary-50" : ""
                      }`}
                      onClick={() => handleTechnicianToggle(tech.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {tech.first_name?.[0] || "?"}
                            {tech.last_name?.[0] || "?"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">
                            {tech.first_name} {tech.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {tech.email}
                          </div>
                        </div>
                      </div>
                      {selectedTechs.includes(tech.id) && (
                        <Check size={18} className="text-primary-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Individual Technician Schedules */}
          {selectedTechs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    Individual Schedules
                  </div>
                </label>
                {selectedTechs.length > 1 && (
                  <div className="flex items-center gap-2">
                    {areSchedulesDifferent() && (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Different times
                      </span>
                    )}
                    <button
                      onClick={setAllSameTime}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Set All Same Time
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {selectedTechs.map((techId) => {
                  const tech = technicians.find((t) => t.id === techId);
                  const schedule = technicianSchedules[techId];

                  if (!tech || !schedule) return null;

                  return (
                    <div
                      key={techId}
                      className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {tech.first_name?.[0] || "?"}
                            {tech.last_name?.[0] || "?"}
                          </span>
                        </div>
                        <span className="font-medium text-sm">
                          {tech.first_name} {tech.last_name}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={schedule.scheduleDate}
                            onChange={(e) =>
                              handleScheduleChange(
                                techId,
                                "scheduleDate",
                                e.target.value
                              )
                            }
                            className="input w-full text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={schedule.scheduleTime}
                            onChange={(e) =>
                              handleScheduleChange(
                                techId,
                                "scheduleTime",
                                e.target.value
                              )
                            }
                            className="input w-full text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                const technicianSchedulesArray = selectedTechs.map(
                  (techId) => ({
                    technicianId: techId,
                    ...technicianSchedules[techId],
                  })
                );

                onSave({
                  technicianIds: selectedTechs,
                  technicianSchedules: technicianSchedulesArray,
                });
              }}
              className="btn btn-primary"
              disabled={
                selectedTechs.length > 0 &&
                selectedTechs.some(
                  (techId) =>
                    !technicianSchedules[techId]?.scheduleDate ||
                    !technicianSchedules[techId]?.scheduleTime
                )
              }
            >
              Assign{" "}
              {selectedTechs.length > 0
                ? `(${selectedTechs.length})`
                : "(Remove All)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
