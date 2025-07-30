import { useEffect, useRef } from "react";

interface JobMarker {
  marker: google.maps.Marker;
  job: any;
}

interface JobMarkersProps {
  jobs: any[];
  mapInstance: google.maps.Map | null;
  onJobClick: (job: any) => void;
}

const JobMarkers = ({ jobs, mapInstance, onJobClick }: JobMarkersProps) => {
  const jobMarkersRef = useRef<JobMarker[]>([]);

  useEffect(() => {
    if (!mapInstance || !jobs.length) return;

    // Clear existing job markers
    jobMarkersRef.current.forEach((jobMarker) => {
      jobMarker.marker.setMap(null);
    });
    jobMarkersRef.current = [];

    jobs.forEach((job) => {
      if (
        job.locations?.address &&
        job.locations?.city &&
        job.locations?.state
      ) {
        // For now, use a default location since we don't have coordinates
        // In a real app, you'd want to geocode the address
        const position = {
          lat: 33.749, // Default to Atlanta coordinates
          lng: -84.388,
        };

        // Create marker
        const marker = new google.maps.Marker({
          position,
          map: mapInstance,
          title: `${job.name} - ${job.locations.address}, ${job.locations.city}, ${job.locations.state}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#DC2626", // Red color for job markers
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          },
        });

        // Add click listener
        marker.addListener("click", () => {
          onJobClick(job);
        });

        jobMarkersRef.current.push({ marker, job });
      }
    });

    // Cleanup function
    return () => {
      jobMarkersRef.current.forEach((jobMarker) => {
        jobMarker.marker.setMap(null);
      });
      jobMarkersRef.current = [];
    };
  }, [jobs, mapInstance, onJobClick]);

  return null; // This component doesn't render anything visible
};

export default JobMarkers;
