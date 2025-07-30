import { useEffect, useRef } from "react";

interface CurrentLocationMarkerProps {
  currentUserLocation: { lat: number; lng: number } | null;
  mapInstance: google.maps.Map | null;
}

const CurrentLocationMarker = ({
  currentUserLocation,
  mapInstance,
}: CurrentLocationMarkerProps) => {
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (currentUserLocation && mapInstance) {
      // Remove existing current location marker
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
      }

      // Create new current location marker
      const marker = new google.maps.Marker({
        position: currentUserLocation,
        map: mapInstance,
        title: "Your Current Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
        zIndex: 1000, // Ensure it's on top
      });

      // Add click listener to show coordinates
      marker.addListener("click", () => {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3">
              <h3 class="font-semibold text-blue-600 mb-2">📍 Your Current Location</h3>
              <p class="text-sm text-gray-700 mb-1">Latitude: ${currentUserLocation.lat.toFixed(
                6
              )}</p>
              <p class="text-sm text-gray-700">Longitude: ${currentUserLocation.lng.toFixed(
                6
              )}</p>
            </div>
          `,
        });
        infoWindow.open(mapInstance, marker);
      });

      currentLocationMarkerRef.current = marker;
    }

    // Cleanup function
    return () => {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.setMap(null);
      }
    };
  }, [currentUserLocation, mapInstance]);

  return null; // This component doesn't render anything visible
};

export default CurrentLocationMarker;
