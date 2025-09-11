import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Eye, Image as ImageIcon, FileText } from "lucide-react";

interface InspectionAttachment {
  id: string;
  inspection_id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  file_type: string;
  created_at: string;
  updated_at: string;
}

interface InspectionAttachmentPreviewProps {
  inspectionId: string;
  onAttachmentClick?: () => void;
  refreshTrigger?: number; // Add a refresh trigger prop
}

const InspectionAttachmentPreview: React.FC<
  InspectionAttachmentPreviewProps
> = ({ inspectionId, onAttachmentClick, refreshTrigger }) => {
  const { supabase } = useSupabase();
  const [attachments, setAttachments] = useState<InspectionAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttachments();
  }, [inspectionId, refreshTrigger]); // Add refreshTrigger as dependency

  const fetchAttachments = async () => {
    if (!supabase || !inspectionId) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inspection_attachments")
        .select("*")
        .eq("inspection_id", inspectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null; // Don't render anything if no attachments
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2 flex-wrap">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative group cursor-pointer"
            onClick={() => {
              // Open attachment in new tab or trigger the attachment modal
              if (isImageFile(attachment.file_type)) {
                window.open(attachment.file_url, "_blank");
              } else {
                // For non-image files, download them
                const link = document.createElement("a");
                link.href = attachment.file_url;
                link.download = attachment.file_name;
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
          >
            <div className="w-16 h-16 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
              {isImageFile(attachment.file_type) ? (
                <img
                  src={attachment.file_url}
                  alt={attachment.title || attachment.file_name}
                  className="w-full h-full object-cover"
                  style={{
                    imageRendering: "high-quality", // Maintains image quality
                    objectFit: "cover", // Fills the entire box while maintaining aspect ratio
                    objectPosition: "center", // Centers the image within the box
                  }}
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="flex items-center justify-center w-full h-full">
                          <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                      `;
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InspectionAttachmentPreview;
