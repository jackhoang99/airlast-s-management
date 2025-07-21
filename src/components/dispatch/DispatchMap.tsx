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
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);

  const fullAddress = selectedCall
    ? `${selectedCall.address}${
        selectedCall.city ? ", " + selectedCall.city : ""
      }${selectedCall.state ? ", " + selectedCall.state : ""} ${
        selectedCall.zip
      }`
    : "Atlanta, GA";

  // Initialize map only once
  useEffect(() => {
    let isMounted = true;
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "routes"],
        });
        const google = await loader.load();
        if (mapRef.current && !mapInstanceRef.current && isMounted) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: 33.749, lng: -84.388 }, // Default Atlanta
            zoom: 10,
          });
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };
    initMap();
    return () => {
      isMounted = false;
      if (markerRef.current) markerRef.current.setMap(null);
      if (userMarker) userMarker.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center and marker on address change
  useEffect(() => {
    const updateMap = async () => {
      if (!mapInstanceRef.current) return;
      const google = window.google;
      if (!google) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          mapInstanceRef.current!.setCenter(results[0].geometry.location);
          mapInstanceRef.current!.setZoom(16);
          if (markerRef.current) markerRef.current.setMap(null);
          markerRef.current = new google.maps.Marker({
            map: mapInstanceRef.current!,
            position: results[0].geometry.location,
          });
          markerRef.current.addListener("click", () => {
            if (onMarkerJobClick && selectedCall && selectedCall.locationId) {
              onMarkerJobClick(selectedCall.locationId);
            }
          });
        } else {
          // fallback: show Atlanta
          mapInstanceRef.current!.setCenter({ lat: 33.749, lng: -84.388 });
          mapInstanceRef.current!.setZoom(10);
        }
      });
    };
    updateMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullAddress]);

  // Watch user location and update blue dot
  useEffect(() => {
    let watchId: number | null = null;
    let marker: google.maps.Marker | null = null;
    if (navigator.geolocation && mapInstanceRef.current) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const position = { lat: latitude, lng: longitude };
          if (!marker) {
            marker = new window.google.maps.Marker({
              position,
              map: mapInstanceRef.current!,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
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
  }, [userMarker]);

  return <div ref={mapRef} className={`h-[300px] rounded-lg ${className}`} />;
};

export default Map;
