import { Calendar, Plus } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Link } from "react-router-dom";
import { useMediaQuery } from "react-responsive";

interface DispatchFiltersProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  sortBy: "job_type" | "zip_code" | "date";
  onSortChange: (sort: "job_type" | "zip_code" | "date") => void;
  filterJobType: string;
  onJobTypeFilterChange: (type: string) => void;
  filterZipCode: string;
  onZipCodeFilterChange: (zip: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  dragModeActive: boolean;
  onActivateDragMode: () => void;
  onCancelDragMode: () => void;
  jobsByDate: Record<string, number>; // { 'YYYY-MM-DD': jobCount }
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
  searchTerm,
  onSearchTermChange,
  dragModeActive,
  onActivateDragMode,
  onCancelDragMode,
  jobsByDate,
}: DispatchFiltersProps) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const [showCalendar, setShowCalendar] = useState(false);
  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div
      className={`bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0 ${
        isMobile ? "flex flex-col gap-3" : ""
      }`}
    >
      <div
        className={`flex ${
          isMobile ? "flex-col gap-3" : "items-center justify-between gap-4"
        }`}
      >
        {/* Left: Search and Filters */}
        <div
          className={`flex ${
            isMobile
              ? "flex-col gap-3 w-full"
              : "flex-wrap items-center gap-3 text-sm"
          }`}
        >
          <input
            type="text"
            placeholder="Search jobs, locations, etc..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className={`input ${
              isMobile ? "w-full h-12 text-base" : "text-xs w-48"
            }`}
            style={isMobile ? { minWidth: 0 } : { minWidth: 180 }}
          />
          <div
            className={`flex ${
              isMobile ? "flex-col gap-2" : "items-center gap-2"
            }`}
          >
            <label className="text-xs font-medium text-gray-700">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                onSortChange(e.target.value as "job_type" | "zip_code" | "date")
              }
              className={`select ${
                isMobile ? "w-full h-12 text-base" : "text-xs"
              }`}
            >
              <option value="job_type">Job Type</option>
              <option value="zip_code">Zip Code</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div
            className={`flex ${
              isMobile ? "flex-col gap-2" : "items-center gap-2"
            }`}
          >
            <label className="text-xs font-medium text-gray-700">
              Job Type:
            </label>
            <select
              value={filterJobType}
              onChange={(e) => onJobTypeFilterChange(e.target.value)}
              className={`select ${
                isMobile ? "w-full h-12 text-base" : "text-xs"
              }`}
            >
              <option value="all">All Types</option>
              <option value="preventative maintenance">
                Preventative Maintenance
              </option>
              <option value="service call">Service Call</option>
              <option value="repair">Repair</option>
              <option value="installation">Installation</option>
              <option value="inspection">Inspection</option>
            </select>
          </div>
          <div
            className={`flex ${
              isMobile ? "flex-col gap-2" : "items-center gap-2"
            }`}
          >
            <label className="text-xs font-medium text-gray-700">
              Zip Code:
            </label>
            <input
              type="text"
              placeholder="Filter by zip"
              value={filterZipCode}
              onChange={(e) => onZipCodeFilterChange(e.target.value)}
              className={`input ${
                isMobile ? "w-full h-12 text-base" : "text-xs w-24"
              }`}
            />
          </div>
        </div>
        {/* Right: Action Buttons */}
        <div
          className={`flex ${
            isMobile ? "flex-col gap-2 w-full" : "items-center gap-2"
          }`}
        >
          <div className="relative">
            <button
              className={`btn btn-secondary ${
                isMobile ? "w-full h-12 text-base" : ""
              }`}
              onClick={() => setShowCalendar((v) => !v)}
              type="button"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </button>
            {showCalendar && (
              <div className="absolute z-50 mt-2 bg-white border rounded shadow-lg p-2">
                <DayPicker
                  mode="single"
                  selected={currentDate}
                  onSelect={(date) => {
                    if (date) onDateChange(date);
                    setShowCalendar(false);
                  }}
                  modifiers={{
                    hasJobs: (date) => {
                      const key = date.toISOString().split("T")[0];
                      return jobsByDate[key] > 0;
                    },
                  }}
                  modifiersClassNames={{
                    hasJobs: "bg-red-500 text-white",
                  }}
                  modifiersStyles={{
                    hasJobs: { backgroundColor: "#ef4444", color: "#fff" },
                  }}
                  onDayMouseEnter={(date) => {
                    const key = date.toISOString().split("T")[0];
                    if (jobsByDate[key]) {
                      setTooltip({
                        date: key,
                        count: jobsByDate[key],
                        x: window.event?.clientX ?? 0,
                        y: window.event?.clientY ?? 0,
                      });
                    }
                  }}
                  onDayMouseLeave={() => setTooltip(null)}
                />
                {tooltip && (
                  <div
                    className="absolute bg-black text-white text-xs rounded px-2 py-1"
                    style={{ left: tooltip.x + 10, top: tooltip.y - 10 }}
                  >
                    {tooltip.count} job{tooltip.count > 1 ? "s" : ""} on this
                    day
                  </div>
                )}
              </div>
            )}
          </div>
          <Link
            to="/jobs/create"
            className={`btn btn-primary ${
              isMobile ? "w-full h-12 text-base" : ""
            }`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Link>
          {!dragModeActive ? (
            <button
              className={`btn btn-success ml-2 ${
                isMobile ? "w-full h-12 text-base ml-0" : ""
              }`}
              onClick={onActivateDragMode}
              type="button"
            >
              Click here to drag a job
            </button>
          ) : (
            <button
              className={`btn btn-outline-secondary ml-2 ${
                isMobile ? "w-full h-12 text-base ml-0" : ""
              }`}
              onClick={onCancelDragMode}
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {/* Current Date Display */}
      <div className="mb-2">
        <span className="text-sm font-medium text-gray-900">
          {formatDate(currentDate)}
        </span>
      </div>
    </div>
  );
};

export default DispatchFilters;
