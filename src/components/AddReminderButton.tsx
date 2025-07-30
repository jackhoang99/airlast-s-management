import { useState } from "react";
import { Plus, Bell } from "lucide-react";
import ReminderModal from "./jobs/ReminderModal";

interface AddReminderButtonProps {
  jobId?: string;
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
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const AddReminderButton = ({
  jobId,
  jobTechnicians,
  onReminderSent,
  variant = "primary",
  size = "md",
  showIcon = true,
  className = "",
  children,
}: AddReminderButtonProps) => {
  const [showReminderModal, setShowReminderModal] = useState(false);

  const getButtonClasses = () => {
    const baseClasses = "btn flex items-center gap-1";

    const variantClasses = {
      primary: "btn-primary",
      secondary: "btn-secondary",
      outline: "btn-outline",
    };

    const sizeClasses = {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  const handleReminderSent = () => {
    if (onReminderSent) {
      onReminderSent();
    }
    setShowReminderModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowReminderModal(true)}
        className={getButtonClasses()}
      >
        {showIcon && <Plus className="h-4 w-4" />}
        {children || (
          <>
            <Bell className="h-4 w-4" />
            Add Reminder
          </>
        )}
      </button>

      {jobId && (
        <ReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          jobId={jobId}
          jobTechnicians={jobTechnicians}
          onReminderSent={handleReminderSent}
        />
      )}
    </>
  );
};

export default AddReminderButton;
