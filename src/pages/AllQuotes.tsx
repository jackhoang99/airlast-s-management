import { useEffect, useState } from "react";
import { useSupabase } from "../lib/supabase-context";
import { Link } from "react-router-dom";
import { FileSpreadsheet, FileText, Eye, Trash2 } from "lucide-react";
import ArrowBack from "../components/ui/ArrowBack";
import QuotePDFViewer from "../components/quotes/QuotePDFViewer";

const TABS = [
  { key: "replacement", label: "Replacement Quotes" },
  { key: "repair", label: "Repair Quotes" },
];

const statusColor = (status: string) => {
  switch (status) {
    case "Approved":
      return "text-success-700 bg-success-100";
    case "Declined":
      return "text-error-700 bg-error-100";
    case "Pending":
    default:
      return "text-gray-700 bg-gray-100";
  }
};

export default function AllQuotes() {
  const { supabase } = useSupabase();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"replacement" | "repair">(
    "replacement"
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState<null | {
    jobId: string;
    quoteType: "replacement" | "repair";
  }>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      const { data: quotesData, error } = await supabase
        .from("job_quotes")
        .select(
          "*, jobs:job_id(number, name, contact_name, contact_email, locations(name, companies(name)), job_units:job_units!inner(unit_id, units:unit_id(id, unit_number)))"
        )
        .order("created_at", { ascending: false });
      if (!error && quotesData) {
        setQuotes(quotesData);
        // Build a job lookup for quick access
        const jobMap: any = {};
        quotesData.forEach((q: any) => {
          if (q.jobs) jobMap[q.job_id] = q.jobs;
        });
        setJobs(jobMap);
      }
      setLoading(false);
    };
    fetchQuotes();
  }, [supabase]);

  // Filter and sort quotes
  const filteredQuotes = quotes
    .filter((q) => q.quote_type === activeTab)
    .filter((q) => {
      if (!search) return true;
      const job = jobs[q.job_id] || {};
      return (
        (q.quote_number &&
          q.quote_number.toLowerCase().includes(search.toLowerCase())) ||
        (job.name && job.name.toLowerCase().includes(search.toLowerCase())) ||
        (job.number &&
          job.number.toLowerCase().includes(search.toLowerCase())) ||
        (job.contact_name &&
          job.contact_name.toLowerCase().includes(search.toLowerCase())) ||
        (job.contact_email &&
          job.contact_email.toLowerCase().includes(search.toLowerCase()))
      );
    })
    .filter((q) => {
      if (!statusFilter) return true;
      if (statusFilter === "Approved") return q.confirmed && q.approved;
      if (statusFilter === "Declined") return q.confirmed && !q.approved;
      if (statusFilter === "Pending") return !q.confirmed;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "amount") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  if (previewing) {
    return (
      <QuotePDFViewer
        jobId={previewing.jobId}
        quoteType={previewing.quoteType}
        onBack={() => setPreviewing(null)}
        backLabel="Back to All Quotes"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <ArrowBack
            fallbackRoute="/"
            className="text-gray-500 hover:text-gray-700"
          />
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary-600" />
            <h1 className="text-2xl font-bold">All Quotes</h1>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`px-4 py-2 rounded-md font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary-600 text-primary-700 bg-primary-50"
                    : "border-transparent text-gray-600 bg-white hover:bg-gray-50"
                }`}
                onClick={() => setActiveTab(tab.key as any)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="input input-bordered w-full sm:w-64"
            placeholder="Search quotes, jobs, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input input-bordered w-full sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
      </div>
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => setSortField("quote_number")}
                >
                  Quote #
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => setSortField("job_id")}
                >
                  Job
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => setSortField("amount")}
                >
                  Amount
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => setSortField("created_at")}
                >
                  Sent
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                  onClick={() => setSortField("confirmed_at")}
                >
                  Confirmed
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
                    Loading quotes...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
                    No quotes found.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const job = jobs[q.job_id] || {};
                  let status = "Pending";
                  if (q.confirmed && q.approved) status = "Approved";
                  else if (q.confirmed && !q.approved) status = "Declined";
                  return (
                    <tr key={q.id}>
                      <td className="px-4 py-2 whitespace-nowrap font-mono">
                        {q.quote_number}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Link
                          to={`/jobs/${q.job_id}`}
                          className="text-primary-600 hover:underline"
                        >
                          {job.number || q.job_id} - {job.name || "(No Name)"}
                        </Link>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        ${Number(q.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {q.created_at
                          ? new Date(q.created_at).toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {q.confirmed_at
                          ? new Date(q.confirmed_at).toLocaleString()
                          : "-"}
                      </td>
                      <td
                        className={`px-4 py-2 whitespace-nowrap font-semibold rounded ${statusColor(
                          status
                        )}`}
                      >
                        {status}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {job.contact_name || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {job.locations?.companies?.name || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {job.contact_email || q.email || "-"}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                        <Link
                          to={`/jobs/${q.job_id}`}
                          className="btn btn-xs btn-success"
                        >
                          View Job
                        </Link>
                        <button
                          className="btn btn-xs btn-primary flex items-center gap-1"
                          onClick={() =>
                            setPreviewing({
                              jobId: q.job_id,
                              quoteType: q.quote_type,
                            })
                          }
                        >
                          <Eye size={14} />
                          View PDF
                        </button>
                        <button
                          className="btn btn-xs btn-error flex items-center gap-1"
                          onClick={async () => {
                            if (!supabase) return;
                            if (
                              window.confirm(
                                "Are you sure you want to delete this quote?"
                              )
                            ) {
                              setDeleteError(null);
                              try {
                                const { error } = await supabase
                                  .from("job_quotes")
                                  .delete()
                                  .eq("id", q.id);
                                if (error) throw error;
                                // Refresh quotes
                                const { data: quotesData, error: fetchError } =
                                  await supabase
                                    .from("job_quotes")
                                    .select(
                                      "*, jobs:job_id(number, name, contact_name, contact_email, locations(name, companies(name)), job_units:job_units!inner(unit_id, units:unit_id(id, unit_number)))"
                                    )
                                    .order("created_at", { ascending: false });
                                if (!fetchError && quotesData)
                                  setQuotes(quotesData);
                              } catch (err) {
                                setDeleteError("Failed to delete quote");
                              }
                            }
                          }}
                          title="Delete Quote"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {deleteError && (
        <div className="bg-error-50 text-error-700 p-2 rounded mb-2">
          {deleteError}
        </div>
      )}
    </div>
  );
}
