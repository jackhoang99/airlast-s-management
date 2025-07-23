import React from "react";

interface JobTypeLegendProps {
  className?: string;
  showTitle?: boolean;
}

const JobTypeLegend: React.FC<JobTypeLegendProps> = ({
  className = "",
  showTitle = true,
}) => {
  const jobTypeColors = [
    {
      type: "preventative maintenance",
      label: "PM (Filter Change, Cleaning AC/HEAT)",
      color: "bg-purple-500",
      description: "Regular maintenance tasks",
    },
    {
      type: "planned maintenance",
      label: "ONE (Filter Change, Cleaning AC/HEAT)",
      color: "bg-purple-500",
      description: "Scheduled maintenance activities",
    },
    {
      type: "service call",
      label: "Service Call",
      color: "bg-teal-500",
      description: "Emergency or urgent service requests",
    },
    {
      type: "repair",
      label: "Repair",
      color: "bg-orange-500",
      description: "Repair and troubleshooting work",
    },
    {
      type: "installation",
      label: "Installation",
      color: "bg-green-500",
      description: "New equipment installation",
    },
    {
      type: "inspection",
      label: "Inspection",
      color: "bg-blue-500",
      description: "System inspections and assessments",
    },
  ];

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      {showTitle && (
        <h3 className="text-sm font-medium text-gray-700 mb-3">Job Types:</h3>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {jobTypeColors.map((jobType) => (
          <div key={jobType.type} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${jobType.color}`}></div>
            <span className="text-xs text-gray-700">{jobType.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobTypeLegend;
