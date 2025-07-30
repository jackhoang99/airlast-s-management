import { useState } from "react";
import { FileText, X, Thermometer, Gauge } from "lucide-react";

interface RefrigerantGuideProps {
  onClose: () => void;
}

interface RefrigerantData {
  name: string;
  type: string;
  pressures: { temp: number; low: number; high: number }[];
}

const RefrigerantGuide = ({ onClose }: RefrigerantGuideProps) => {
  const [selectedRefrigerant, setSelectedRefrigerant] = useState("R-22");
  const [temperature, setTemperature] = useState("");
  const [pressure, setPressure] = useState("");

  const refrigerants: RefrigerantData[] = [
    {
      name: "R-22",
      type: "HCFC (Phased out)",
      pressures: [
        { temp: -20, low: 12.9, high: 260.9 },
        { temp: -10, low: 18.4, high: 308.8 },
        { temp: 0, low: 25.2, high: 363.3 },
        { temp: 10, low: 33.6, high: 424.7 },
        { temp: 20, low: 43.5, high: 493.8 },
        { temp: 30, low: 54.9, high: 571.4 },
        { temp: 40, low: 68.0, high: 658.2 },
        { temp: 50, low: 82.9, high: 755.1 },
        { temp: 60, low: 99.7, high: 863.0 },
        { temp: 70, low: 118.5, high: 982.9 },
        { temp: 80, low: 139.4, high: 1115.8 },
        { temp: 90, low: 162.5, high: 1262.8 },
        { temp: 100, low: 187.9, high: 1424.9 },
        { temp: 110, low: 215.7, high: 1603.2 },
        { temp: 120, low: 246.0, high: 1798.8 },
        { temp: 130, low: 278.9, high: 2012.8 },
        { temp: 140, low: 314.5, high: 2246.3 },
        { temp: 150, low: 352.9, high: 2500.5 },
      ],
    },
    {
      name: "R-410A",
      type: "HFC (Current standard)",
      pressures: [
        { temp: -20, low: 33.4, high: 399.6 },
        { temp: -10, low: 42.8, high: 456.8 },
        { temp: 0, low: 53.8, high: 520.4 },
        { temp: 10, low: 66.5, high: 590.9 },
        { temp: 20, low: 81.0, high: 668.9 },
        { temp: 30, low: 97.4, high: 755.0 },
        { temp: 40, low: 115.8, high: 849.8 },
        { temp: 50, low: 136.3, high: 954.0 },
        { temp: 60, low: 159.0, high: 1068.3 },
        { temp: 70, low: 184.0, high: 1193.4 },
        { temp: 80, low: 211.4, high: 1330.0 },
        { temp: 90, low: 241.3, high: 1478.9 },
        { temp: 100, low: 273.8, high: 1640.8 },
        { temp: 110, low: 309.0, high: 1816.5 },
        { temp: 120, low: 347.0, high: 2006.8 },
        { temp: 130, low: 387.9, high: 2212.5 },
        { temp: 140, low: 431.8, high: 2434.4 },
        { temp: 150, low: 478.8, high: 2673.3 },
      ],
    },
    {
      name: "R-134A",
      type: "HFC (Automotive/Commercial)",
      pressures: [
        { temp: -20, low: 8.5, high: 84.3 },
        { temp: -10, low: 12.2, high: 95.8 },
        { temp: 0, low: 16.7, high: 108.5 },
        { temp: 10, low: 22.1, high: 122.4 },
        { temp: 20, low: 28.6, high: 137.6 },
        { temp: 30, low: 36.3, high: 154.2 },
        { temp: 40, low: 45.4, high: 172.3 },
        { temp: 50, low: 55.9, high: 192.0 },
        { temp: 60, low: 68.0, high: 213.4 },
        { temp: 70, low: 81.8, high: 236.6 },
        { temp: 80, low: 97.4, high: 261.7 },
        { temp: 90, low: 114.9, high: 288.8 },
        { temp: 100, low: 134.4, high: 318.0 },
        { temp: 110, low: 156.0, high: 349.4 },
        { temp: 120, low: 179.8, high: 383.1 },
        { temp: 130, low: 205.9, high: 419.2 },
        { temp: 140, low: 234.4, high: 457.8 },
        { temp: 150, low: 265.4, high: 499.0 },
      ],
    },
  ];

  const selectedRefrigerantData = refrigerants.find(
    (r) => r.name === selectedRefrigerant
  );

  const findPressureFromTemp = (temp: number) => {
    if (!selectedRefrigerantData) return null;

    const entry = selectedRefrigerantData.pressures.find(
      (p) => p.temp === temp
    );
    if (entry) return entry;

    // Interpolate if exact temperature not found
    const lower = selectedRefrigerantData.pressures.find((p) => p.temp < temp);
    const upper = selectedRefrigerantData.pressures.find((p) => p.temp > temp);

    if (lower && upper) {
      const ratio = (temp - lower.temp) / (upper.temp - lower.temp);
      return {
        temp,
        low: lower.low + (upper.low - lower.low) * ratio,
        high: lower.high + (upper.high - lower.high) * ratio,
      };
    }

    return null;
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const temp = parseFloat(e.target.value);
    setTemperature(e.target.value);

    if (!isNaN(temp)) {
      const pressureData = findPressureFromTemp(temp);
      if (pressureData) {
        setPressure(
          `${pressureData.low.toFixed(1)} / ${pressureData.high.toFixed(1)}`
        );
      } else {
        setPressure("Out of range");
      }
    } else {
      setPressure("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-semibold">
                Refrigerant Pressure-Temperature Guide
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Refrigerant Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Refrigerant
              </label>
              <select
                value={selectedRefrigerant}
                onChange={(e) => setSelectedRefrigerant(e.target.value)}
                className="w-full input"
              >
                {refrigerants.map((refrigerant) => (
                  <option key={refrigerant.name} value={refrigerant.name}>
                    {refrigerant.name} - {refrigerant.type}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Calculator */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Thermometer className="h-4 w-4 mr-2" />
                Quick Pressure Calculator
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    value={temperature}
                    onChange={handleTemperatureChange}
                    placeholder="Enter temperature"
                    className="w-full input text-sm"
                    step="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Pressure (PSIG) - Low/High
                  </label>
                  <div className="w-full input bg-gray-100 text-sm">
                    {pressure || "---"}
                  </div>
                </div>
              </div>
            </div>

            {/* Pressure-Temperature Chart */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <Gauge className="h-4 w-4 mr-2" />
                Pressure-Temperature Chart for {selectedRefrigerant}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-2 py-1 text-left">
                        Temp (°F)
                      </th>
                      <th className="border border-gray-200 px-2 py-1 text-left">
                        Low Side (PSIG)
                      </th>
                      <th className="border border-gray-200 px-2 py-1 text-left">
                        High Side (PSIG)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRefrigerantData?.pressures.map((entry, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="border border-gray-200 px-2 py-1 font-medium">
                          {entry.temp}
                        </td>
                        <td className="border border-gray-200 px-2 py-1">
                          {entry.low.toFixed(1)}
                        </td>
                        <td className="border border-gray-200 px-2 py-1">
                          {entry.high.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Safety Notes */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">
                Safety Notes
              </h3>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Always verify refrigerant type before charging</li>
                <li>• Never mix different refrigerants</li>
                <li>• Use proper PPE when handling refrigerants</li>
                <li>• Check for leaks before and after service</li>
                <li>• Follow EPA regulations for refrigerant handling</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button onClick={onClose} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefrigerantGuide;
