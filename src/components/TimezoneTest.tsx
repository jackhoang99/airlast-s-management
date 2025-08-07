import React from "react";
import {
  formatJobDate,
  formatJobTime,
  formatJobDateTime,
  getCurrentTimezone,
} from "../utils/dateUtils";

const TimezoneTest = () => {
  // Test data - simulate what comes from your database
  const testDate = "2025-08-07"; // August 7, 2025
  const testTime = "09:00:00"; // 9:00 AM
  const testDateTime = "2025-08-07T09:00:00Z"; // UTC time

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Timezone Test</h3>

      <div className="space-y-2 text-sm">
        <div>
          <strong>App Timezone:</strong> {getCurrentTimezone()}
        </div>

        <div>
          <strong>Test Date:</strong> {testDate}
        </div>

        <div>
          <strong>Test Time:</strong> {testTime}
        </div>

        <div>
          <strong>Test DateTime (UTC):</strong> {testDateTime}
        </div>

        <hr className="my-2" />

        <div>
          <strong>Formatted Date:</strong> {formatJobDate(testDate)}
        </div>

        <div>
          <strong>Formatted Time:</strong> {formatJobTime(testTime)}
        </div>

        <div>
          <strong>Formatted DateTime:</strong> {formatJobDateTime(testDateTime)}
        </div>

        <div>
          <strong>Date + Time Combined:</strong>{" "}
          {formatJobDateTime(testDate, testTime)}
        </div>
      </div>

      <div className="mt-4 p-2 bg-yellow-100 rounded text-xs">
        <strong>Expected Result:</strong> All dates should show as August 7,
        2025 in Eastern Time
      </div>
    </div>
  );
};

export default TimezoneTest;
