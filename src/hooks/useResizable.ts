import { useState, useCallback, useRef, useEffect } from "react";

interface UseResizableOptions {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  containerHeight?: number;
}

export const useResizable = (options: UseResizableOptions = {}) => {
  const {
    initialHeight = 60, // percentage
    minHeight = 20,
    maxHeight = 80,
    containerHeight = 100,
  } = options;

  const [topHeight, setTopHeight] = useState(initialHeight);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;

      const container = resizeRef.current.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const percentage = (relativeY / rect.height) * 100;

      // Clamp the percentage between min and max
      const clampedPercentage = Math.min(
        Math.max(percentage, minHeight),
        maxHeight
      );

      setTopHeight(clampedPercentage);
    },
    [isResizing, minHeight, maxHeight]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    topHeight,
    isResizing,
    resizeRef,
    handleMouseDown,
  };
};
