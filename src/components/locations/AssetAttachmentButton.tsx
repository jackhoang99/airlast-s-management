import { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";

interface AssetAttachmentButtonProps {
  asset: any;
  onViewAttachments?: (asset: any) => void;
}

const AssetAttachmentButton = ({
  asset,
  onViewAttachments,
}: AssetAttachmentButtonProps) => {
  const { supabase } = useSupabase();
  const [hasAttachments, setHasAttachments] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (asset) {
      checkForAttachments();
    }
  }, [asset]);

  const checkForAttachments = async () => {
    if (!supabase || !asset) return;

    try {
      setIsLoading(true);

      // Get the job_id from the asset's model data
      const jobId = asset.model?.job_id;
      if (!jobId) {
        setHasAttachments(false);
        return;
      }

      // Fetch inspection data for this job
      const { data: inspections, error: inspectionError } = await supabase
        .from("job_inspections")
        .select("id")
        .eq("job_id", jobId);

      if (inspectionError) {
        console.error("Error fetching inspections:", inspectionError);
        setHasAttachments(false);
        return;
      }

      if (!inspections || inspections.length === 0) {
        setHasAttachments(false);
        return;
      }

      const inspectionIds = inspections.map((insp: any) => insp.id);

      // Check if there are any attachments for these inspections
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from("inspection_attachments")
        .select("id")
        .in("inspection_id", inspectionIds)
        .limit(1);

      if (attachmentsError) {
        console.error("Error checking attachments:", attachmentsError);
        setHasAttachments(false);
        return;
      }

      setHasAttachments(attachmentsData && attachmentsData.length > 0);
    } catch (err: any) {
      console.error("Error checking for attachments:", err);
      setHasAttachments(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <span className="text-gray-400">Loading...</span>;
  }

  if (hasAttachments === null || !hasAttachments) {
    return <span className="text-gray-500">N/A</span>;
  }

  return (
    <button
      onClick={() => onViewAttachments?.(asset)}
      className="text-primary-600 hover:text-primary-800 underline"
    >
      View Attachments
    </button>
  );
};

export default AssetAttachmentButton;
