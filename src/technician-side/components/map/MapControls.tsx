import {
  User,
  Briefcase,
  Navigation,
  Layers,
  Car,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface MapControlsProps {
  showTechnicianPanel: boolean;
  showJobPanel: boolean;
  trafficEnabled: boolean;
  showTopBar: boolean;
  onToggleTechnicianPanel: () => void;
  onToggleJobPanel: () => void;
  onUpdateLocation: () => void;
  onToggleMapType: () => void;
  onToggleTraffic: () => void;
  onToggleTopBar: () => void;
}

const MapControls = ({
  showTechnicianPanel,
  showJobPanel,
  trafficEnabled,
  showTopBar,
  onToggleTechnicianPanel,
  onToggleJobPanel,
  onUpdateLocation,
  onToggleMapType,
  onToggleTraffic,
  onToggleTopBar,
}: MapControlsProps) => {
  if (!showTopBar) {
    return (
      <div className="absolute top-4 left-4 z-20">
        <button
          onClick={onToggleTopBar}
          className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          title="Show Controls"
        >
          <ChevronDown size={20} className="text-blue-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 right-4 z-20">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className={`p-2 rounded-lg ${
                showTechnicianPanel
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={onToggleTechnicianPanel}
              title="Technicians"
            >
              <User size={20} />
            </button>
            <button
              className={`p-2 rounded-lg ${
                showJobPanel
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={onToggleJobPanel}
              title="Jobs"
            >
              <Briefcase size={20} />
            </button>
            <button
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={onUpdateLocation}
              title="Update Current Location"
            >
              <Navigation size={20} />
            </button>
            <button
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              onClick={onToggleMapType}
            >
              <Layers size={20} />
            </button>
            <button
              className={`p-2 rounded-lg ${
                trafficEnabled
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              onClick={onToggleTraffic}
            >
              <Car size={20} />
            </button>
          </div>
          <button
            onClick={onToggleTopBar}
            className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
            title="Hide Controls"
          >
            <ChevronUp size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MapControls;
