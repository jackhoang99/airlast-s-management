import React from "react";
import { useHorizontalScroll } from "../../hooks/useHorizontalScroll";

interface HorizontalScrollTableProps {
  children: React.ReactNode;
  className?: string;
  scrollSpeed?: number;
}

const HorizontalScrollTable: React.FC<HorizontalScrollTableProps> = ({
  children,
  className = "",
  scrollSpeed = 50,
}) => {
  const scrollRef = useHorizontalScroll(scrollSpeed);

  return (
    <div
      ref={scrollRef}
      className={`overflow-x-auto ${className}`}
      style={{
        // Add subtle visual indicators for horizontal scrolling
        scrollbarWidth: "thin",
        scrollbarColor: "#cbd5e0 #f7fafc",
      }}
    >
      {children}
    </div>
  );
};

export default HorizontalScrollTable;
