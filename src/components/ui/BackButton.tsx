import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackRoute?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({
  fallbackRoute,
  children = "Back",
  className = "flex items-center text-gray-600 hover:text-gray-900",
  onClick,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else if (fallbackRoute) {
      // Fallback to specified route if no history
      navigate(fallbackRoute);
    } else {
      // Default fallback to home
      navigate("/");
    }
  };

  return (
    <button onClick={handleBack} className={className} type="button">
      <ArrowLeft size={16} className="mr-1" />
      {children}
    </button>
  );
};

export default BackButton;
