// Pending inspection attachment type for new inspections
export type PendingInspectionAttachment = {
  id: string;
  title: string;
  description?: string;
  file: File;
  file_name: string;
  file_size: number;
  file_type: string;
};

// Props for pending inspection attachment section
export interface PendingInspectionAttachmentSectionProps {
  attachments: PendingInspectionAttachment[];
  onAdd: (attachment: Omit<PendingInspectionAttachment, "id">) => void;
  onRemove: (id: string) => void;
}

// Props for add pending inspection attachment modal
export interface AddPendingInspectionAttachmentModalProps {
  onSave: (data: {
    title: string;
    description?: string;
    file: File;
    file_name: string;
    file_size: number;
    file_type: string;
  }) => void;
  onCancel: () => void;
}
