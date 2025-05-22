export interface Job {
  id: string;
  number: string;
  name: string;
  status: string;
  type: string;
  owner_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_type: string | null;
  location_id: string | null;
  contract_id: string | null;
  contract_name: string | null;
  office: string | null;
  is_training: boolean | null;
  time_period_start: string;
  time_period_due: string;
  schedule_start: string | null;
  schedule_duration: string | null;
  created_at: string;
  updated_at: string;
  service_line: string | null;
  description: string | null;
  problem_description: string | null;
  customer_po: string | null;
  service_contract: string | null;
  schedule_date: string | null;
  schedule_time: string | null;
  unit_id: string | null;
  quote_sent: boolean | null;
  quote_sent_at: string | null;
  quote_token: string | null;
  quote_confirmed: boolean | null;
  quote_confirmed_at: string | null;
  locations?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    companies: {
      name: string;
    };
  };
  units?: {
    unit_number: string;
  };
  job_technicians?: {
    id: string;
    technician_id: string;
    is_primary: boolean;
    users: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
  }[];
}

export interface JobItem {
  id: string;
  job_id: string;
  code: string;
  name: string;
  service_line: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  type: string;
  created_at: string;
}