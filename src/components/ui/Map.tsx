import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapProps {
  address: string;
  city: string;
  state: string;
  zip: string;
  className?: string;
}

const Map = ({ address, city, state, zip, className = '' }: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;

  useEffect(() => {
    const loader = new Loader({
      apiKey: 'AIzaSyD_uE4BrfLPIJOvRWb9hcFapAQ4Pd0P-lk',
      version: 'weekly',
    });

    loader.load().then(() => {
      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === 'OK' && results && results[0] && mapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: results[0].geometry.location,
            zoom: 16,
          });

          new google.maps.Marker({
            map,
            position: results[0].geometry.location,
          });
        }
      });
    });
  }, [fullAddress]);

  return <div ref={mapRef} className={`h-[300px] rounded-lg ${className}`} />;
};

export default Map;