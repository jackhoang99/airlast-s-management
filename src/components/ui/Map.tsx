import { useEffect, useRef } from "react";
import loader from "../../utils/loadGoogleMaps";

interface MapProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  className?: string;
}

const Map = ({ address, city, state, zip, className = "" }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  useEffect(() => {
    const initMap = async () => {
      try {
        // Use centralized loader

        const google = await loader.load();

        if (!mapRef.current) return;

        const geocoder = new google.maps.Geocoder();

        geocoder.geocode(
          { address: fullAddress },
          (results: any, status: any) => {
            if (status === "OK" && results?.[0]) {
              const map = new google.maps.Map(mapRef.current!, {
                center: results[0].geometry.location,
                zoom: 16,
              });

              new google.maps.Marker({
                map,
                position: results[0].geometry.location,
              });
            } else {
              console.warn("Geocode failed:", status);
            }
          }
        );
      } catch (error) {
        console.error("Error loading Google Maps:", error);
      }
    };

    initMap();
  }, [fullAddress]);

  return <div ref={mapRef} className={`h-[300px] rounded-lg ${className}`} />;
};

export default Map;
