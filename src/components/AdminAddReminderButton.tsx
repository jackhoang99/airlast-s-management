import { useState } from "react";
import { Plus, Bell } from "lucide-react";
import ReminderModal from "./jobs/ReminderModal";

interface AdminAddReminderButtonProps {
  onReminderSent?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const AdminAddReminderButton = ({
  onReminderSent,
  variant = "primary",
  size = "md",
  showIcon = true,
  className = "",
  children,
}: AdminAddReminderButtonProps) => {
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

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        jobId="" // Empty string for admin reminders (not tied to a job)
        jobTechnicians={[]} // Empty array since admin reminders don't need technicians
        onReminderSent={handleReminderSent}
      />
    </>
  );
};

export default AdminAddReminderButton;
