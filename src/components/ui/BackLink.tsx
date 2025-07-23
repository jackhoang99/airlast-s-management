import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  fallbackRoute?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const BackLink: React.FC<BackLinkProps> = ({
  fallbackRoute,
  children = "Back",
  className = "flex items-center text-gray-600 hover:text-gray-900",
  onClick,
}) => {
  const navigate = useNavigate();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();

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
    <a href="#" onClick={handleBack} className={className}>
      <ArrowLeft size={16} className="mr-1" />
      {children}
    </a>
  );
};

export default BackLink;
