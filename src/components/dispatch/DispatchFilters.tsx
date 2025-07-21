import { Calendar, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface DispatchFiltersProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  sortBy: "job_type" | "zip_code" | "date";
  onSortChange: (sort: "job_type" | "zip_code" | "date") => void;
  filterJobType: string;
  onJobTypeFilterChange: (type: string) => void;
  filterZipCode: string;
  onZipCodeFilterChange: (zip: string) => void;
}

const DispatchFilters = ({
  currentDate,
  onDateChange,
  sortBy,
  onSortChange,
  filterJobType,
  onJobTypeFilterChange,
  filterZipCode,
  onZipCodeFilterChange,
}: DispatchFiltersProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-semibold">Dispatch & Schedule</h1>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => onDateChange(new Date())}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Today
          </button>
          <Link to="/jobs/create" className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Link>
        </div>
      </div>

      {/* Current Date Display */}
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-900">{formatDate(currentDate)}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as "job_type" | "zip_code" | "date")}
            className="select text-xs"
          >
            <option value="job_type">Job Type</option>
            <option value="zip_code">Zip Code</option>
            <option value="date">Date</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Job Type:</label>
          <select
            value={filterJobType}
            onChange={(e) => onJobTypeFilterChange(e.target.value)}
            className="select text-xs"
          >
            <option value="all">All Types</option>
            <option value="preventative maintenance">Preventative Maintenance</option>
            <option value="service call">Service Call</option>
            <option value="repair">Repair</option>
            <option value="installation">Installation</option>
            <option value="inspection">Inspection</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Zip Code:</label>
          <input
            type="text"
            placeholder="Filter by zip"
            value={filterZipCode}
            onChange={(e) => onZipCodeFilterChange(e.target.value)}
            className="input text-xs w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default DispatchFilters;