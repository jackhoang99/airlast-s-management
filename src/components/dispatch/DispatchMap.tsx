import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface Call {
  address: string;
  zip: string;
  city?: string;
  state?: string;
  locationId?: string;
  company?: string;
  unit?: string;
}

interface MapProps {
  selectedCall?: Call | null;
  className?: string;
  onMarkerJobClick?: (jobIdOrLocationId: string) => void;
}

const Map = ({ selectedCall, className = "", onMarkerJobClick }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);

  const fullAddress = selectedCall
    ? `${selectedCall.address}${
        selectedCall.city ? ", " + selectedCall.city : ""
      }${selectedCall.state ? ", " + selectedCall.state : ""} ${
        selectedCall.zip
      }`
    : "Atlanta, GA";

  // Watch user location and update blue dot
  useEffect(() => {
    let watchId: number | null = null;
    let marker: google.maps.Marker | null = null;
    if (navigator.geolocation && mapInstance) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const position = { lat: latitude, lng: longitude };
          if (!marker) {
            marker = new google.maps.Marker({
              position,
              map: mapInstance,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#2563eb", // blue-600
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#fff",
              },
              zIndex: 999,
            });
            setUserMarker(marker);
          } else {
            marker.setPosition(position);
          }
        },
        (err) => {
          console.warn("Geolocation error:", err);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
    }
    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [mapInstance]);

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "routes"],
        });

        const google = await loader.load();

        if (mapRef.current) {
          const geocoder = new google.maps.Geocoder();

          geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === "OK" && results && results[0] && mapRef.current) {
              const map = new google.maps.Map(mapRef.current, {
                center: results[0].geometry.location,
                zoom: 16,
              });
              setMapInstance(map);

              const marker = new google.maps.Marker({
                map,
                position: results[0].geometry.location,
              });

              marker.addListener("click", () => {
                if (
                  onMarkerJobClick &&
                  selectedCall &&
                  selectedCall.locationId
                ) {
                  onMarkerJobClick(selectedCall.locationId);
                }
              });
            } else if (mapRef.current) {
              // fallback: show Atlanta
              const map = new google.maps.Map(mapRef.current, {
                center: { lat: 33.749, lng: -84.388 },
                zoom: 10,
              });
              setMapInstance(map);
            }
          });
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress]);

  return <div ref={mapRef} className={`h-[300px] rounded-lg ${className}`} />;
};

export default Map;
