import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface Call {
  address: string;
  zip: string;
  city?: string;
  state?: string;
}

interface MapProps {
  selectedCall?: Call | null;
  className?: string;
}

const Map = ({ selectedCall, className = "" }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const fullAddress = selectedCall
    ? `${selectedCall.address}${
        selectedCall.city ? ", " + selectedCall.city : ""
      }${selectedCall.state ? ", " + selectedCall.state : ""} ${
        selectedCall.zip
      }`
    : "Atlanta, GA";

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

              new google.maps.Marker({
                map,
                position: results[0].geometry.location,
              });
            } else if (mapRef.current) {
              // fallback: show Atlanta
              const map = new google.maps.Map(mapRef.current, {
                center: { lat: 33.749, lng: -84.388 },
                zoom: 10,
              });
            }
          });
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
  }, [fullAddress]);

  return <div ref={mapRef} className={`h-[300px] rounded-lg ${className}`} />;
};

export default Map;
