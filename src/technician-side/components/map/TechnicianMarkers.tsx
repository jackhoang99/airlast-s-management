import { useEffect, useRef } from "react";
import { Technician } from "../../types/technician";

interface TechnicianMarker {
  id: string;
  marker: google.maps.Marker;
  infoWindow: google.maps.InfoWindow;
  labelMarker: google.maps.Marker;
}

interface TechnicianMarkersProps {
  technicians: Technician[];
  mapInstance: google.maps.Map | null;
  onTechnicianClick: (technician: Technician) => void;
  onCheckInOut: (technician: Technician) => void;
}

const TechnicianMarkers = ({
  technicians,
  mapInstance,
  onTechnicianClick,
  onCheckInOut,
}: TechnicianMarkersProps) => {
  const technicianMarkersRef = useRef<TechnicianMarker[]>([]);

  useEffect(() => {
    if (!mapInstance || !technicians.length) return;

    // Clear existing technician markers
    technicianMarkersRef.current.forEach((techMarker) => {
      techMarker.marker.setMap(null);
      techMarker.labelMarker.setMap(null);
      techMarker.infoWindow.close();
    });
    technicianMarkersRef.current = [];

    technicians.forEach((technician) => {
      if (technician.location) {
        // Create custom marker icon based on status
        const getMarkerIcon = (status: string) => {
          const colors = {
            available: "#10B981", // Green
            on_job: "#F59E0B", // Yellow
            offline: "#6B7280", // Gray
          };

          return {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: colors[status as keyof typeof colors] || colors.offline,
            fillOpacity: 0.9,
            strokeColor: "#FFFFFF",
            strokeWeight: 2,
          };
        };

        // Use real current location if available, otherwise fallback to assigned location
        const markerPosition = technician.current_location || technician.location;

        // Create marker with technician name
        const marker = new google.maps.Marker({
          position: markerPosition,
          map: mapInstance,
          title: `${technician.first_name} ${technician.last_name}`,
          icon: getMarkerIcon(technician.status),
        });

        // Create a separate label marker for the technician initials
        const labelMarker = new google.maps.Marker({
          position: markerPosition,
          map: mapInstance,
          label: {
            text: `${technician.first_name[0]}${technician.last_name[0]}`,
            color: "#FFFFFF",
            fontSize: "14px",
            fontWeight: "bold",
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0, // Make the background circle invisible
            fillColor: "transparent",
            fillOpacity: 0,
            strokeColor: "transparent",
            strokeWeight: 0,
          },
        });

        // Create info window content
        const getInfoWindowContent = (tech: Technician) => {
          const statusColors = {
            available: "text-green-600",
            on_job: "text-yellow-600",
            offline: "text-gray-600",
          };

          const statusText = {
            available: "Available",
            on_job: "On Job",
            offline: "Offline",
          };

          // Get coordinates for location display
          const lat = tech.location?.lat?.toFixed(4) || "33.7490";
          const lng = tech.location?.lng?.toFixed(4) || "-84.3880";

          return `
            <div class="p-3 max-w-xs">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span class="text-sm font-semibold">${tech.first_name[0]}${
            tech.last_name[0]
          }</span>
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900">${tech.first_name} ${
            tech.last_name
          }</h3>
                  <p class="text-sm ${statusColors[tech.status]}">${
            statusText[tech.status]
          }</p>
                </div>
              </div>
              <div class="space-y-1 text-sm text-gray-600">
                <p>Jobs: ${tech.job_count}</p>
                ${
                  tech.current_job_name
                    ? `<p>Current: ${tech.current_job_name}</p>`
                    : ""
                }
                ${
                  tech.next_job_time
                    ? `<p>Next: ${new Date(
                        tech.next_job_time
                      ).toLocaleTimeString()}</p>`
                    : ""
                }
                <p class="text-blue-600 font-medium">📍 Atlanta, GA</p>
                <p class="text-xs text-gray-500">${lat}, ${lng}</p>
              </div>
              <div class="mt-3 flex gap-2">
                <button onclick="window.handleTechnicianClick('${
                  tech.id
                }')" class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                  View Details
                </button>
                <button onclick="window.handleCheckInOut('${
                  tech.id
                }')" class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                  ${tech.status === "available" ? "Check In" : "Check Out"}
                </button>
              </div>
            </div>
          `;
        };

        const infoWindow = new google.maps.InfoWindow({
          content: getInfoWindowContent(technician),
        });

        // Add click listener
        marker.addListener("click", () => {
          onTechnicianClick(technician);
        });

        // Store marker references
        technicianMarkersRef.current.push({
          id: technician.id,
          marker,
          infoWindow,
          labelMarker,
        });
      }
    });

    // Add global handlers for info window buttons
    (window as any).handleTechnicianClick = (techId: string) => {
      const tech = technicians.find((t) => t.id === techId);
      if (tech) {
        onTechnicianClick(tech);
      }
    };

    (window as any).handleCheckInOut = async (techId: string) => {
      const tech = technicians.find((t) => t.id === techId);
      if (tech) {
        onCheckInOut(tech);
      }
    };

    // Cleanup function
    return () => {
      technicianMarkersRef.current.forEach((techMarker) => {
        techMarker.marker.setMap(null);
        techMarker.labelMarker.setMap(null);
        techMarker.infoWindow.close();
      });
      technicianMarkersRef.current = [];
    };
  }, [technicians, mapInstance, onTechnicianClick, onCheckInOut]);

  return null; // This component doesn't render anything visible
};

export default TechnicianMarkers;
