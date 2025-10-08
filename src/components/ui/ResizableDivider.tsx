import React from "react";
import { GripHorizontal, ChevronUp, ChevronDown } from "lucide-react";

interface ResizableDividerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing?: boolean;
}

const ResizableDivider: React.FC<ResizableDividerProps> = ({
  onMouseDown,
  isResizing = false,
}) => {
  return (
    <div
      className={`
        relative flex items-center justify-center
        h-3 cursor-ns-resize select-none
        bg-gray-100 hover:bg-gray-200 transition-colors
        ${isResizing ? "bg-gray-300" : ""}
        border-t border-b border-gray-300
      `}
      onMouseDown={onMouseDown}
    >
      <div className="flex flex-col items-center space-y-0.5">
        <ChevronUp size={12} className="text-gray-500" />
        <div className="flex items-center space-x-1">
          <GripHorizontal size={14} className="text-gray-500" />
          <GripHorizontal size={14} className="text-gray-500" />
        </div>
        <ChevronDown size={12} className="text-gray-500" />
      </div>
    </div>
  );
};

export default ResizableDivider;
