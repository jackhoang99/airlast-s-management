export const getJobTypeColor = (jobType: string) => {
  const colorMap: { [key: string]: string } = {
    maintenance: "bg-purple-100 text-purple-800 border-purple-200",
    "service call": "bg-teal-100 text-teal-800 border-teal-200",
    inspection: "bg-blue-100 text-blue-800 border-blue-200",
    repair: "bg-orange-100 text-orange-800 border-orange-200",
    installation: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    colorMap[jobType.toLowerCase()] ||
    "bg-gray-100 text-gray-800 border-gray-200"
  );
};

export const getJobTypeBorderColor = (jobType: string) => {
  const borderColorMap: { [key: string]: string } = {
    maintenance: "border-l-purple-500",
    "service call": "border-l-teal-500",
    inspection: "border-l-blue-500",
    repair: "border-l-orange-500",
    installation: "border-l-green-500",
  };

  return borderColorMap[jobType.toLowerCase()] || "border-l-gray-500";
};

export const getJobTypeBackgroundColor = (jobType: string) => {
  const bgColorMap: { [key: string]: string } = {
    maintenance: "bg-purple-50",
    "service call": "bg-teal-50",
    inspection: "bg-blue-50",
    repair: "bg-orange-50",
    installation: "bg-green-50",
  };

  return bgColorMap[jobType.toLowerCase()] || "bg-gray-50";
};

export const getJobTypeHoverColor = (jobType: string) => {
  const hoverColorMap: { [key: string]: string } = {
    maintenance: "hover:bg-purple-100",
    "service call": "hover:bg-teal-100",
    inspection: "hover:bg-blue-100",
    repair: "hover:bg-orange-100",
    installation: "hover:bg-green-100",
  };

  return hoverColorMap[jobType.toLowerCase()] || "hover:bg-gray-100";
};
