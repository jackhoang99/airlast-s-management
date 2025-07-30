export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  status: "available" | "on_job" | "offline";
  current_job_id?: string;
  current_job_name?: string;
  job_count: number;
  next_job_time?: string;
  last_check_in?: string;
  location?: {
    lat: number;
    lng: number;
  };
  current_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  technician_location?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
}
