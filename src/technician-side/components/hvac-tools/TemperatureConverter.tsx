import { useState } from "react";
import { Thermometer, ArrowRight, X } from "lucide-react";

interface TemperatureConverterProps {
  onClose: () => void;
}

const TemperatureConverter = ({ onClose }: TemperatureConverterProps) => {
  const [fahrenheit, setFahrenheit] = useState("");
  const [celsius, setCelsius] = useState("");

  const convertFtoC = (f: string) => {
    if (f === "") {
      setCelsius("");
      return;
    }
    const fNum = parseFloat(f);
    if (!isNaN(fNum)) {
      const c = ((fNum - 32) * 5) / 9;
      setCelsius(c.toFixed(1));
    }
  };

  const convertCtoF = (c: string) => {
    if (c === "") {
      setFahrenheit("");
      return;
    }
    const cNum = parseFloat(c);
    if (!isNaN(cNum)) {
      const f = (cNum * 9) / 5 + 32;
      setFahrenheit(f.toFixed(1));
    }
  };

  const handleFahrenheitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFahrenheit(value);
    convertFtoC(value);
  };

  const handleCelsiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCelsius(value);
    convertCtoF(value);
  };

  const clearAll = () => {
    setFahrenheit("");
    setCelsius("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Thermometer className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold">Temperature Converter</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Fahrenheit to Celsius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fahrenheit (°F)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={fahrenheit}
                onChange={handleFahrenheitChange}
                placeholder="Enter temperature"
                className="flex-1 input"
                step="0.1"
              />
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex-1 input bg-gray-50">
                {celsius ? `${celsius}°C` : "---"}
              </div>
            </div>
          </div>

          {/* Celsius to Fahrenheit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Celsius (°C)
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={celsius}
                onChange={handleCelsiusChange}
                placeholder="Enter temperature"
                className="flex-1 input"
                step="0.1"
              />
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="flex-1 input bg-gray-50">
                {fahrenheit ? `${fahrenheit}°F` : "---"}
              </div>
            </div>
          </div>

          {/* Common Temperature Reference */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Common HVAC Temperatures
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Room Temperature:</span>
                <span>72°F / 22°C</span>
              </div>
              <div className="flex justify-between">
                <span>Freezing Point:</span>
                <span>32°F / 0°C</span>
              </div>
              <div className="flex justify-between">
                <span>Boiling Point:</span>
                <span>212°F / 100°C</span>
              </div>
              <div className="flex justify-between">
                <span>AC Supply Air:</span>
                <span>55°F / 13°C</span>
              </div>
              <div className="flex justify-between">
                <span>Heat Supply Air:</span>
                <span>120°F / 49°C</span>
              </div>
              <div className="flex justify-between">
                <span>Refrigerant Boiling:</span>
                <span>-15°F / -26°C</span>
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

export default TemperatureConverter;
