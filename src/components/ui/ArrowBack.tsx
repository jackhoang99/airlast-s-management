import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface ArrowBackProps {
  fallbackRoute?: string;
  className?: string;
  onClick?: () => void;
}

const ArrowBack: React.FC<ArrowBackProps> = ({
  fallbackRoute,
  className = "text-gray-600 hover:text-gray-900",
  onClick,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
    } else if (fallbackRoute) {
      navigate(fallbackRoute);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className={className}
      type="button"
      aria-label="Go back"
    >
      <ArrowLeft size={20} />
    </button>
  );
};

export default ArrowBack;
