import { useState } from "react";
import { Wind, ArrowRight, X, Calculator } from "lucide-react";

interface AirflowCalculatorProps {
  onClose: () => void;
}

const AirflowCalculator = ({ onClose }: AirflowCalculatorProps) => {
  const [ductSize, setDuctSize] = useState("");
  const [velocity, setVelocity] = useState("");
  const [cfm, setCfm] = useState("");
  const [calculationType, setCalculationType] = useState<"velocity" | "cfm">(
    "velocity"
  );

  const calculateCFM = () => {
    if (ductSize && velocity) {
      const size = parseFloat(ductSize);
      const vel = parseFloat(velocity);
      if (!isNaN(size) && !isNaN(vel)) {
        // CFM = Area × Velocity
        // Area = π × (diameter/2)² for round ducts
        const area = Math.PI * Math.pow(size / 2, 2);
        const calculatedCFM = area * vel;
        setCfm(calculatedCFM.toFixed(0));
      }
    }
  };

  const calculateVelocity = () => {
    if (ductSize && cfm) {
      const size = parseFloat(ductSize);
      const cfmValue = parseFloat(cfm);
      if (!isNaN(size) && !isNaN(cfmValue)) {
        // Velocity = CFM / Area
        const area = Math.PI * Math.pow(size / 2, 2);
        const calculatedVelocity = cfmValue / area;
        setVelocity(calculatedVelocity.toFixed(1));
      }
    }
  };

  const handleDuctSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDuctSize(e.target.value);
  };

  const handleVelocityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVelocity(e.target.value);
    if (calculationType === "velocity") {
      calculateCFM();
    }
  };

  const handleCFMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCfm(e.target.value);
    if (calculationType === "cfm") {
      calculateVelocity();
    }
  };

  const clearAll = () => {
    setDuctSize("");
    setVelocity("");
    setCfm("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Wind className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold">Airflow Calculator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Calculation Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calculate
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setCalculationType("velocity")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                  calculationType === "velocity"
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                CFM from Velocity
              </button>
              <button
                onClick={() => setCalculationType("cfm")}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                  calculationType === "cfm"
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Velocity from CFM
              </button>
            </div>
          </div>

          {/* Duct Size Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duct Diameter (inches)
            </label>
            <input
              type="number"
              value={ductSize}
              onChange={handleDuctSizeChange}
              placeholder="Enter duct diameter"
              className="w-full input"
              step="0.1"
            />
          </div>

          {/* Velocity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Air Velocity (ft/min)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={velocity}
                onChange={handleVelocityChange}
                placeholder="Enter velocity"
                className="flex-1 input"
                step="0.1"
                disabled={calculationType === "cfm"}
              />
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex-1 input bg-gray-50">
                {calculationType === "cfm" && cfm ? `${cfm} CFM` : "---"}
              </div>
            </div>
          </div>

          {/* CFM Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Airflow (CFM)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={cfm}
                onChange={handleCFMChange}
                placeholder="Enter CFM"
                className="flex-1 input"
                step="0.1"
                disabled={calculationType === "velocity"}
              />
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex-1 input bg-gray-50">
                {calculationType === "velocity" && velocity
                  ? `${velocity} ft/min`
                  : "---"}
              </div>
            </div>
          </div>

          {/* Common Airflow Reference */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Common Airflow Standards
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Residential Supply:</span>
                <span>400-600 CFM/ton</span>
              </div>
              <div className="flex justify-between">
                <span>Commercial Supply:</span>
                <span>350-450 CFM/ton</span>
              </div>
              <div className="flex justify-between">
                <span>Return Air:</span>
                <span>80-90% of supply</span>
              </div>
              <div className="flex justify-between">
                <span>Duct Velocity (Supply):</span>
                <span>700-900 ft/min</span>
              </div>
              <div className="flex justify-between">
                <span>Duct Velocity (Return):</span>
                <span>500-700 ft/min</span>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button onClick={clearAll} className="flex-1 btn btn-secondary">
              Clear
            </button>
            <button onClick={onClose} className="flex-1 btn btn-primary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirflowCalculator;
