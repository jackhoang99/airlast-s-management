import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { CheckSquare, Square, Save, AlertTriangle } from "lucide-react";

type MaintenanceTask = {
  id?: string;
  job_id: string;
  job_unit_id?: string;
  task_description: string;
  completed: boolean;
  notes?: string;
  reading_value?: string;
  task_order: number;
};

type MaintenanceChecklistProps = {
  jobId: string;
  jobType: string;
  additionalType: string | null;
  jobUnits?: { id: string; unit_number: string }[];
  onChecklistUpdated?: () => void;
  onCompletionChange?: (isComplete: boolean) => void;
};

const MaintenanceChecklist = ({
  jobId,
  jobType,
  additionalType,
  jobUnits,
  onChecklistUpdated,
  onCompletionChange,
}: MaintenanceChecklistProps) => {
  const { supabase } = useSupabase();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Define checklist templates based on job type
  const getChecklistTemplate = (): string[] => {
    if (
      additionalType === "PM Filter Change" ||
      additionalType === "ONE Filter Change"
    ) {
      return [
        "Filter Size",
        "Replace & Date all filters",
        "Flush and Drain lines",
        "Cycle all condensate pumps",
        "Test all safety switches",
      ];
    }

    // AC Cleaning checklists
    if (
      additionalType === "PM Cleaning AC" ||
      additionalType === "ONE Cleaning AC"
    ) {
      return [
        "Inspect and replace air filters",
        "Check and clean condenser coils",
        "Inspect evaporator coils and clean if necessary",
        "Check refrigerant levels and recharge if needed",
        "Inspect refrigerant lines for leaks",
        "Clean and inspect blower assembly",
        "Lubricate moving parts (motors, bearings, etc.)",
        "Inspect and tighten electrical connections",
        "Test thermostat calibration and operation",
        "Inspect and test safety controls",
        "Inspect belts and pulleys for wear and alignment",
        "Clean and inspect drain lines and pans",
        "Test system startup and shutdown operation",
        "Check and verify system operating pressures",
        "Measure voltage and amperage on motors",
        "Inspect ductwork for leaks and insulation integrity",
        "Check outside air dampers and economizer operation",
        "Replace or calibrate sensors as required",
        "Review building management system (BMS) controls",
        "Provide service report and recommendations",
      ];
    }

    // HEAT Cleaning checklists
    if (
      additionalType === "PM Cleaning HEAT" ||
      additionalType === "ONE Cleaning HEAT"
    ) {
      return [
        "Inspect and replace air filters",
        "Check heat exchanger, if applicable",
        "Inspect evaporator coils and clean if necessary",
        "Check refrigerant levels and recharge if needed",
        "Inspect refrigerant lines for leaks",
        "Clean and inspect blower assembly",
        "Lubricate moving parts (motors, bearings, etc.)",
        "Inspect and tighten electrical connections",
        "Test thermostat calibration and operation",
        "Inspect and test safety controls",
        "Inspect belts and pulleys for wear and alignment",
        "Clean and inspect drain lines and pans",
        "Test system startup and shutdown operation",
        "Check and verify system operating pressures",
        "Measure voltage and amperage on motors",
        "Inspect ductwork for leaks and insulation integrity",
        "Check outside air dampers and economizer operation",
        "Replace or calibrate sensors as required",
        "Review building management system (BMS) controls",
        "Provide service report and recommendations",
      ];
    }

    return [];
  };

  // Check if task requires a reading value (text input)
  const requiresReadingValue = (taskDescription: string): boolean => {
    const filterChangeTasks = [
      "Filter Size",
      "Replace & Date all filters",
      "Flush and Drain lines",
      "Cycle all condensate pumps",
      "Test all safety switches",
    ];

    return filterChangeTasks.includes(taskDescription);
  };

  // Load existing checklist data
  useEffect(() => {
    const loadChecklist = async () => {
      if (!supabase || !jobId) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("job_maintenance_checklists")
          .select("*")
          .eq("job_id", jobId)
          .order("task_order");

        if (error) throw error;

        if (data && data.length > 0) {
          setTasks(data);
        } else {
          // Create new checklist from template
          const template = getChecklistTemplate();
          const newTasks: MaintenanceTask[] = template.map(
            (description, index) => ({
              job_id: jobId,
              task_description: description,
              completed: false,
              task_order: index + 1,
            })
          );
          setTasks(newTasks);
        }
      } catch (err) {
        console.error("Error loading checklist:", err);
        setError("Failed to load checklist");
      } finally {
        setIsLoading(false);
      }
    };

    loadChecklist();
  }, [jobId, additionalType, supabase]);

  // Save checklist to database
  const saveChecklist = async () => {
    if (!supabase || !jobId) return;

    try {
      setIsSaving(true);
      setError(null);

      // Delete existing tasks
      await supabase
        .from("job_maintenance_checklists")
        .delete()
        .eq("job_id", jobId);

      // Insert new/updated tasks
      const tasksToInsert = tasks.map((task) => ({
        job_id: task.job_id,
        job_unit_id: task.job_unit_id,
        task_description: task.task_description,
        completed: task.completed,
        notes: task.notes || null,
        reading_value: task.reading_value || null,
        task_order: task.task_order,
      }));

      const { error } = await supabase
        .from("job_maintenance_checklists")
        .insert(tasksToInsert);

      if (error) throw error;

      setSuccess("Checklist saved successfully");
      if (onChecklistUpdated) {
        onChecklistUpdated();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving checklist:", err);
      setError("Failed to save checklist");
    } finally {
      setIsSaving(false);
    }
  };

  // Update task completion status
  const toggleTaskCompletion = (taskIndex: number) => {
    setTasks((prev) =>
      prev.map((task, index) =>
        index === taskIndex ? { ...task, completed: !task.completed } : task
      )
    );
  };

  // Update task notes or reading value
  const updateTaskField = (
    taskIndex: number,
    field: "notes" | "reading_value",
    value: string
  ) => {
    setTasks((prev) =>
      prev.map((task, index) =>
        index === taskIndex ? { ...task, [field]: value } : task
      )
    );
  };

  // Calculate completion percentage
  const completionPercentage =
    tasks.length > 0
      ? Math.round(
          (tasks.filter((task) => task.completed).length / tasks.length) * 100
        )
      : 0;

  // Check if all tasks are completed
  const isFullyCompleted =
    tasks.length > 0 && tasks.every((task) => task.completed);

  // Notify parent component of completion status
  useEffect(() => {
    if (onCompletionChange) {
      onCompletionChange(isFullyCompleted);
    }
  }, [isFullyCompleted, onCompletionChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No maintenance checklist available for this job type.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">PM Checklist</h3>
          <p className="text-sm text-gray-500">
            {completionPercentage}% complete (
            {tasks.filter((t) => t.completed).length}/{tasks.length} tasks)
          </p>
        </div>
        <button
          onClick={saveChecklist}
          disabled={isSaving}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="bg-error-50 border border-error-200 rounded-md p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-error-600" />
          <span className="text-error-700 text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-success-50 border border-success-200 rounded-md p-3">
          <span className="text-success-700 text-sm">{success}</span>
        </div>
      )}

      {/* Checklist tasks */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg transition-colors ${
              task.completed
                ? "border-success-200 bg-success-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleTaskCompletion(index)}
                className="mt-1 flex-shrink-0"
              >
                {task.completed ? (
                  <CheckSquare size={20} className="text-success-600" />
                ) : (
                  <Square
                    size={20}
                    className="text-gray-400 hover:text-gray-600"
                  />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    task.completed
                      ? "text-success-800 line-through"
                      : "text-gray-900"
                  }`}
                >
                  {task.task_description}
                </p>

                {/* Reading value input for filter change tasks */}
                {requiresReadingValue(task.task_description) && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Enter value..."
                      value={task.reading_value || ""}
                      onChange={(e) =>
                        updateTaskField(index, "reading_value", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}

                {/* Notes field for all tasks */}
                <div className="mt-2">
                  <textarea
                    placeholder="Add notes..."
                    value={task.notes || ""}
                    onChange={(e) =>
                      updateTaskField(index, "notes", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MaintenanceChecklist;
