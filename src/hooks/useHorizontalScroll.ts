import { useEffect, useRef } from "react";

/**
 * Custom hook to add horizontal scrolling support using mouse wheel
 * @param scrollSpeed - How fast to scroll horizontally (default: 50)
 */
export const useHorizontalScroll = (scrollSpeed: number = 50) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if the element has horizontal overflow
      if (element.scrollWidth > element.clientWidth) {
        // Prevent default vertical scrolling
        e.preventDefault();

        // Convert vertical wheel movement to horizontal scrolling
        element.scrollLeft += e.deltaY * (scrollSpeed / 100);
      }
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [scrollSpeed]);

  return ref;
};

export default useHorizontalScroll;
