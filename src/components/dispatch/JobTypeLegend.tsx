const JobTypeLegend = () => {
  const jobTypes = [
    {
      type: "maintenance",
      color: "bg-purple-500",
      label: "Maintenance (PM/ONE Filter Change, Cleaning AC/HEAT)",
    },
    { type: "service call", color: "bg-cyan-500", label: "Service Call" },
    { type: "repair", color: "bg-amber-500", label: "Repair" },
    { type: "installation", color: "bg-emerald-500", label: "Installation" },
    { type: "inspection", color: "bg-blue-500", label: "Inspection" },
  ];

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="font-medium text-gray-700">Job Types:</span>
        {jobTypes.map(({ type, color, label }) => (
          <div key={type} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${color}`}></div>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobTypeLegend;
