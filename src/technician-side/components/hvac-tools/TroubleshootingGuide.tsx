import { useState } from "react";
import {
  Wrench,
  X,
  Search,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

interface TroubleshootingGuideProps {
  onClose: () => void;
}

interface Issue {
  category: string;
  symptoms: string[];
  causes: string[];
  solutions: string[];
  priority: "high" | "medium" | "low";
}

const TroubleshootingGuide = ({ onClose }: TroubleshootingGuideProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const issues: Issue[] = [
    {
      category: "Cooling",
      symptoms: ["No cooling", "Insufficient cooling", "Warm air from vents"],
      causes: [
        "Refrigerant leak",
        "Dirty condenser coils",
        "Faulty compressor",
        "Clogged air filter",
      ],
      solutions: [
        "Check for refrigerant leaks and repair",
        "Clean condenser coils",
        "Test compressor operation",
        "Replace air filter",
        "Check thermostat settings",
      ],
      priority: "high",
    },
    {
      category: "Heating",
      symptoms: ["No heat", "Insufficient heat", "Cold air from vents"],
      causes: [
        "Gas valve failure",
        "Dirty burners",
        "Faulty ignitor",
        "Clogged air filter",
      ],
      solutions: [
        "Check gas supply and valve",
        "Clean burners and heat exchanger",
        "Test ignitor operation",
        "Replace air filter",
        "Verify thermostat settings",
      ],
      priority: "high",
    },
    {
      category: "Airflow",
      symptoms: ["Weak airflow", "No airflow", "Uneven cooling/heating"],
      causes: [
        "Clogged air filter",
        "Dirty blower wheel",
        "Ductwork restrictions",
        "Faulty blower motor",
      ],
      solutions: [
        "Replace air filter",
        "Clean blower wheel and housing",
        "Inspect and clean ductwork",
        "Test blower motor operation",
        "Check for duct leaks",
      ],
      priority: "medium",
    },
    {
      category: "Noise",
      symptoms: [
        "Loud operation",
        "Rattling sounds",
        "Squealing noises",
        "Banging sounds",
      ],
      causes: [
        "Loose parts",
        "Worn bearings",
        "Dirty blower wheel",
        "Refrigerant issues",
      ],
      solutions: [
        "Tighten loose screws and bolts",
        "Lubricate bearings if accessible",
        "Clean blower wheel",
        "Check refrigerant levels",
        "Inspect for loose ductwork",
      ],
      priority: "medium",
    },
    {
      category: "Electrical",
      symptoms: [
        "Unit won't start",
        "Frequent cycling",
        "Blown fuses",
        "Tripped breakers",
      ],
      causes: [
        "Faulty capacitor",
        "Bad contactor",
        "Wiring issues",
        "Overloaded circuit",
      ],
      solutions: [
        "Test and replace capacitor if needed",
        "Check contactor operation",
        "Inspect wiring connections",
        "Verify circuit capacity",
        "Test safety switches",
      ],
      priority: "high",
    },
    {
      category: "Thermostat",
      symptoms: [
        "Incorrect temperature",
        "Unit won't respond",
        "Frequent cycling",
      ],
      causes: [
        "Dead batteries",
        "Wiring issues",
        "Calibration problems",
        "Location issues",
      ],
      solutions: [
        "Replace thermostat batteries",
        "Check wiring connections",
        "Recalibrate thermostat",
        "Relocate if near heat sources",
        "Test thermostat operation",
      ],
      priority: "medium",
    },
    {
      category: "Refrigerant",
      symptoms: [
        "Ice on evaporator",
        "High head pressure",
        "Low suction pressure",
      ],
      causes: [
        "Refrigerant leak",
        "Overcharge",
        "Undercharge",
        "Restricted metering device",
      ],
      solutions: [
        "Locate and repair leaks",
        "Recover and recharge to proper levels",
        "Check metering device operation",
        "Clean condenser and evaporator",
        "Verify proper airflow",
      ],
      priority: "high",
    },
    {
      category: "Drainage",
      symptoms: ["Water leaks", "Clogged drain", "Mold growth"],
      causes: [
        "Clogged drain line",
        "Broken drain pan",
        "Improper slope",
        "Algae growth",
      ],
      solutions: [
        "Clear drain line blockage",
        "Replace damaged drain pan",
        "Correct drain line slope",
        "Add drain line treatment",
        "Check for proper drainage",
      ],
      priority: "low",
    },
  ];

  const categories = [
    "all",
    ...Array.from(new Set(issues.map((issue) => issue.category))),
  ];

  const filteredIssues = issues.filter((issue) => {
    const matchesCategory =
      selectedCategory === "all" || issue.category === selectedCategory;
    const matchesSearch =
      searchTerm === "" ||
      issue.symptoms.some((symptom) =>
        symptom.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      issue.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle size={16} />;
      case "medium":
        return <Info size={16} />;
      case "low":
        return <CheckCircle size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Wrench className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-semibold">
                HVAC Troubleshooting Guide
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
            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Issues
                </label>
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search symptoms or categories..."
                    className="w-full input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Filter
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full input"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Issues List */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                Common Issues ({filteredIssues.length})
              </h3>
              {filteredIssues.map((issue, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {issue.category}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getPriorityColor(
                            issue.priority
                          )}`}
                        >
                          {getPriorityIcon(issue.priority)}
                          <span className="capitalize">{issue.priority}</span>
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Symptoms:</strong> {issue.symptoms.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Issue Detail */}
            {selectedIssue && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedIssue.category} Issues
                  </h3>
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Symptoms
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedIssue.symptoms.map((symptom, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          {symptom}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Common Causes
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedIssue.causes.map((cause, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          {cause}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Solutions
                    </h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {selectedIssue.solutions.map((solution, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Safety Reminder */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">
                Safety Reminder
              </h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>
                  • Always turn off power before servicing electrical components
                </li>
                <li>• Use proper PPE when working with refrigerants</li>
                <li>• Follow manufacturer guidelines and local codes</li>
                <li>• When in doubt, consult with a senior technician</li>
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

export default TroubleshootingGuide;
