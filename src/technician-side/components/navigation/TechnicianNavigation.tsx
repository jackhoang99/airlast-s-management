import { useState, useEffect, useRef } from "react";
import {
  X,
  Navigation,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  ChevronRight,
  Info,
  Compass,
  Car,
  RotateCw,
  Layers,
  Maximize,
  Minimize,
  User,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Loader } from "@googlemaps/js-api-loader";

interface TechnicianNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    address: string;
    city: string;
    state: string;
    zip: string;
    name: string;
  };
  job: any;
}

const TechnicianNavigation = ({
  isOpen,
  onClose,
  location,
  job,
}: TechnicianNavigationProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null);
  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);
  const [technicianLocation, setTechnicianLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<string | null>(
    null
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapType, setMapType] = useState<string>("roadmap");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsSteps, setDirectionsSteps] = useState<
    google.maps.DirectionsStep[]
  >([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showJobInfo, setShowJobInfo] = useState(false);
  const [arrivalTime, setArrivalTime] = useState<string | null>(null);
  const [watchPositionId, setWatchPositionId] = useState<number | null>(null);
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const [techMarker, setTechMarker] = useState<google.maps.Marker | null>(null);
  const [destMarker, setDestMarker] = useState<google.maps.Marker | null>(null);
  const [googleMaps, setGoogleMaps] = useState<typeof google.maps | null>(null);

  // Get technician's current location
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTechnicianLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Atlanta if location access is denied
          setTechnicianLocation({ lat: 33.7489954, lng: -84.3902397 });
        }
      );

      // Set up continuous location tracking
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setTechnicianLocation(newLocation);

          // If we're navigating, update the route
          if (
            isNavigating &&
            map &&
            directionsService &&
            directionsRenderer &&
            destinationLocation
          ) {
            updateRoute(newLocation, destinationLocation);
          }

          // Update technician marker position
          if (techMarker) {
            techMarker.setPosition(newLocation);
          }
        },
        (error) => {
          console.error("Error watching position:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 10000,
        }
      );

      setWatchPositionId(watchId);

      // Clean up watch position on unmount
      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    } else {
      // Default to Atlanta if geolocation is not supported
      setTechnicianLocation({ lat: 33.7489954, lng: -84.3902397 });
    }
  }, [
    isOpen,
    isNavigating,
    map,
    directionsService,
    directionsRenderer,
    destinationLocation,
  ]);

  // Geocode the destination address
  useEffect(() => {
    if (!isOpen || !location) return;

    const geocodeAddress = async () => {
      try {
        // In a real app, you would use Google's Geocoding API
        // For this demo, we'll generate a random point near Atlanta
        const atlantaLat = 33.7489954;
        const atlantaLng = -84.3902397;

        // Random offset within ~5 miles
        const latOffset = (Math.random() - 0.5) * 0.1;
        const lngOffset = (Math.random() - 0.5) * 0.1;

        setDestinationLocation({
          lat: atlantaLat + latOffset,
          lng: atlantaLng + lngOffset,
        });
      } catch (err) {
        console.error("Error geocoding address:", err);
        setError("Failed to geocode address");
      }
    };

    geocodeAddress();
  }, [isOpen, location]);

  // Initialize Google Maps
  useEffect(() => {
    if (!isOpen) return;

    const initMap = async () => {
      try {
        setIsLoading(true);

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
          version: "weekly",
          libraries: ["places", "routes", "marker"],
        });

        const google = await loader.load();
        setGoogleMaps(google.maps);

        if (mapRef.current && technicianLocation && destinationLocation) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: technicianLocation,
            zoom: 14,
            mapTypeId: mapType as google.maps.MapTypeId,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
            zoomControl: true,
            zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_TOP,
            },
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }],
              },
            ],
          });

          setMap(mapInstance);

          // Add marker for technician's location
          const techMarkerInstance = new google.maps.Marker({
            position: technicianLocation,
            map: mapInstance,
            title: "Your Location",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#4f46e5",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#FFFFFF",
              scale: 10,
            },
          });

          setTechMarker(techMarkerInstance);

          // Add marker for destination
          const destMarkerInstance = new google.maps.Marker({
            position: destinationLocation,
            map: mapInstance,
            title: location.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "#FFFFFF",
              scale: 10,
            },
          });

          setDestMarker(destMarkerInstance);

          // Initialize directions service and renderer
          const directionsServiceInstance = new google.maps.DirectionsService();
          const directionsRendererInstance = new google.maps.DirectionsRenderer(
            {
              map: mapInstance,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#4f46e5",
                strokeWeight: 5,
              },
            }
          );

          setDirectionsService(directionsServiceInstance);
          setDirectionsRenderer(directionsRendererInstance);

          // Calculate route
          calculateRoute(
            technicianLocation,
            destinationLocation,
            directionsServiceInstance,
            directionsRendererInstance,
            google.maps
          );

          // Enable traffic layer if selected
          if (trafficEnabled) {
            const trafficLayer = new google.maps.TrafficLayer();
            trafficLayer.setMap(mapInstance);
          }

          // Fit bounds to include both points
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(technicianLocation);
          bounds.extend(destinationLocation);
          mapInstance.fitBounds(bounds);
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        setError(
          "Failed to load map. Please check your internet connection and try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (technicianLocation && destinationLocation) {
      initMap();
    }
  }, [
    isOpen,
    technicianLocation,
    destinationLocation,
    mapType,
    trafficEnabled,
  ]);

  const calculateRoute = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    service?: google.maps.DirectionsService,
    renderer?: google.maps.DirectionsRenderer,
    googleMapsApi?: typeof google.maps
  ) => {
    const dirService = service || directionsService;
    const dirRenderer = renderer || directionsRenderer;
    const mapsApi = googleMapsApi || googleMaps;

    if (!dirService || !dirRenderer || !mapsApi) return;

    setIsNavigating(true);
    setIsRecalculating(true);

    dirService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: mapsApi.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: mapsApi.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setIsRecalculating(false);

        if (status === mapsApi.DirectionsStatus.OK && result) {
          dirRenderer.setDirections(result);

          // Get estimated time and distance
          const route = result.routes[0];
          if (route && route.legs.length > 0) {
            setEstimatedTime(route.legs[0].duration?.text || null);
            setEstimatedDistance(route.legs[0].distance?.text || null);

            // Calculate arrival time
            if (route.legs[0].duration) {
              const now = new Date();
              const arrivalDate = new Date(
                now.getTime() + route.legs[0].duration.value * 1000
              );
              setArrivalTime(
                arrivalDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
            }

            // Get directions steps
            if (route.legs[0].steps) {
              setDirectionsSteps(route.legs[0].steps);
              setCurrentStepIndex(0);
            }
          }
        } else {
          console.error("Directions request failed:", status);
          setError("Failed to calculate route. Please try again.");
          setIsNavigating(false);
        }
      }
    );
  };

  const updateRoute = (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ) => {
    if (!directionsService || !directionsRenderer || !googleMaps) return;

    setIsRecalculating(true);

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: googleMaps.TravelMode.DRIVING,
        provideRouteAlternatives: false,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: googleMaps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        setIsRecalculating(false);

        if (status === googleMaps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);

          // Get estimated time and distance
          const route = result.routes[0];
          if (route && route.legs.length > 0) {
            setEstimatedTime(route.legs[0].duration?.text || null);
            setEstimatedDistance(route.legs[0].distance?.text || null);

            // Calculate arrival time
            if (route.legs[0].duration) {
              const now = new Date();
              const arrivalDate = new Date(
                now.getTime() + route.legs[0].duration.value * 1000
              );
              setArrivalTime(
                arrivalDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              );
            }

            // Get directions steps
            if (route.legs[0].steps) {
              setDirectionsSteps(route.legs[0].steps);
            }
          }
        }
      }
    );
  };

  const recalculateRoute = () => {
    if (!technicianLocation || !destinationLocation) return;

    calculateRoute(technicianLocation, destinationLocation);
  };

  const toggleMapType = () => {
    if (!map || !googleMaps) return;

    const newMapType = mapType === "roadmap" ? "satellite" : "roadmap";
    setMapType(newMapType);
    map.setMapTypeId(newMapType as google.maps.MapTypeId);
  };

  const toggleTraffic = () => {
    setTrafficEnabled(!trafficEnabled);

    if (map && googleMaps) {
      if (!trafficEnabled) {
        const trafficLayer = new googleMaps.TrafficLayer();
        trafficLayer.setMap(map);
      } else {
        // This effectively removes the traffic layer
        new googleMaps.TrafficLayer().setMap(null);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const nextStep = () => {
    if (currentStepIndex < directionsSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const openExternalNavigation = () => {
    if (!location) return;

    const address = `${location.address}, ${location.city}, ${location.state} ${location.zip}`;
    const encodedAddress = encodeURIComponent(address);

    // Check if on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Try to open in Google Maps app first
      window.location.href = `https://maps.google.com/?daddr=${encodedAddress}`;
    } else {
      // Open in a new tab
      window.open(
        `https://maps.google.com/maps?daddr=${encodedAddress}`,
        "_blank"
      );
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchPositionId) {
        navigator.geolocation.clearWatch(watchPositionId);
      }
    };
  }, [watchPositionId]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Format HTML instructions to plain text
  const formatInstructions = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-white ${
        isFullscreen ? "fullscreen" : ""
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-semibold">Navigation</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJobInfo(!showJobInfo)}
            className={`p-2 rounded-full ${
              showJobInfo
                ? "bg-primary-100 text-primary-600"
                : "hover:bg-gray-100 text-gray-500"
            }`}
            title="Job Info"
          >
            <Info size={20} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleMapType}
          className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
          title={
            mapType === "roadmap" ? "Switch to Satellite" : "Switch to Map"
          }
        >
          <Layers size={20} />
        </button>
        <button
          onClick={toggleTraffic}
          className={`p-3 rounded-full shadow-md ${
            trafficEnabled
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title={trafficEnabled ? "Hide Traffic" : "Show Traffic"}
        >
          <Car size={20} />
        </button>
        <button
          onClick={recalculateRoute}
          className="p-3 bg-white rounded-full shadow-md text-gray-700 hover:bg-gray-50"
          title="Recalculate Route"
        >
          <RotateCw size={20} />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="bg-white p-4 rounded-lg shadow text-center max-w-md">
              <AlertTriangle className="h-12 w-12 text-error-500 mx-auto mb-3" />
              <p className="text-error-600 font-medium mb-2">{error}</p>
              <button onClick={onClose} className="btn btn-primary mt-2">
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="h-full w-full"></div>
        )}

        {/* Recalculating indicator */}
        {isRecalculating && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            Recalculating...
          </div>
        )}

        {/* Compass */}
        <div className="absolute bottom-40 right-4 p-3 bg-white rounded-full shadow-md">
          <Compass size={24} className="text-primary-600" />
        </div>
      </div>

      {/* Job Info Panel - Slide in from right */}
      {showJobInfo && (
        <div className="absolute top-16 right-0 bottom-0 w-80 bg-white shadow-lg border-l border-gray-200 overflow-y-auto z-20 animate-slide-in-right">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-medium">Job Details</h3>
            <button
              onClick={() => setShowJobInfo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <h4 className="font-medium text-lg">{job.name}</h4>
            <p className="text-gray-600 text-sm mb-4">Job #{job.number}</p>

            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-medium text-gray-500">Location</h5>
                <p className="font-medium">{location.name}</p>
                <p className="text-sm">{location.address}</p>
                <p className="text-sm">
                  {location.city}, {location.state} {location.zip}
                </p>
                {job.units && (
                  <p className="text-sm">Unit: {job.units.unit_number}</p>
                )}
              </div>

              {job.contact_name && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Contact</h5>
                  <p className="font-medium">{job.contact_name}</p>
                  {job.contact_phone && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone size={14} className="text-gray-400" />
                      <a
                        href={`tel:${job.contact_phone}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.contact_phone}
                      </a>
                    </div>
                  )}
                  {job.contact_email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail size={14} className="text-gray-400" />
                      <a
                        href={`mailto:${job.contact_email}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {job.contact_email}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {job.description && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500">
                    Description
                  </h5>
                  <p className="text-sm">{job.description}</p>
                </div>
              )}

              {job.problem_description && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500">Problem</h5>
                  <p className="text-sm">{job.problem_description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Directions Panel - Slide up from bottom when showing directions */}
      {showDirections && directionsSteps.length > 0 && (
        <div className="absolute left-0 right-0 bottom-32 max-h-[50vh] bg-white shadow-lg border-t border-gray-200 overflow-y-auto z-20 animate-slide-up">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
            <h3 className="font-medium">Turn-by-Turn Directions</h3>
            <button
              onClick={() => setShowDirections(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {directionsSteps.map((step, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    index === currentStepIndex
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === currentStepIndex
                          ? "bg-primary-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p
                        className={`${
                          index === currentStepIndex ? "font-medium" : ""
                        }`}
                      >
                        {formatInstructions(step.instructions)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {step.distance?.text || ""} •{" "}
                        {step.duration?.text || ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Panel */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        {/* ETA and Distance */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-500">Estimated arrival</div>
            <div className="text-xl font-bold">{arrivalTime || "--:--"}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Distance</div>
            <div className="text-xl font-bold">{estimatedDistance || "--"}</div>
          </div>
        </div>

        {/* Current Step */}
        {directionsSteps.length > 0 && (
          <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center">
                  {currentStepIndex + 1}
                </div>
                <div className="font-medium">
                  {formatInstructions(
                    directionsSteps[currentStepIndex].instructions
                  )}
                </div>
              </div>
              <div className="text-sm text-primary-700">
                {directionsSteps[currentStepIndex].distance?.text || ""}
              </div>
            </div>

            {/* Step navigation */}
            <div className="flex justify-between mt-3">
              <button
                onClick={prevStep}
                disabled={currentStepIndex === 0}
                className={`p-2 rounded ${
                  currentStepIndex === 0
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-primary-600 hover:bg-primary-100"
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={() => setShowDirections(!showDirections)}
                className="text-primary-600 text-sm font-medium"
              >
                {showDirections ? "Hide All Steps" : "View All Steps"}
              </button>
              <button
                onClick={nextStep}
                disabled={currentStepIndex === directionsSteps.length - 1}
                className={`p-2 rounded ${
                  currentStepIndex === directionsSteps.length - 1
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-primary-600 hover:bg-primary-100"
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          {job.contact_phone && (
            <a
              href={`tel:${job.contact_phone}`}
              className="btn btn-secondary flex-1 flex flex-col items-center justify-center py-3 h-auto"
            >
              <Phone size={20} className="mb-1" />
              <span className="text-xs">Call</span>
            </a>
          )}

          <button
            onClick={recalculateRoute}
            className="btn btn-secondary flex-1 flex flex-col items-center justify-center py-3 h-auto"
          >
            <RotateCw size={20} className="mb-1" />
            <span className="text-xs">Recalculate</span>
          </button>

          <button
            onClick={openExternalNavigation}
            className="btn btn-primary flex-1 flex flex-col items-center justify-center py-3 h-auto"
          >
            <Navigation size={20} className="mb-1" />
            <span className="text-xs">Open Maps</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicianNavigation;
