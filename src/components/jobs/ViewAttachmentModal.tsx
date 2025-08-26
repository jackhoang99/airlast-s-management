import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import {
  Paperclip,
  X,
  Download,
  ExternalLink,
  ZoomIn,
  RotateCcw,
  FileText,
  Image,
  File,
  Maximize2,
} from "lucide-react";

interface ViewAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileName: string;
  fileType: string;
}

const ViewAttachmentModal: React.FC<ViewAttachmentModalProps> = ({
  isOpen,
  onClose,
  filePath,
  fileName,
  fileType,
}) => {
  const { supabase } = useSupabase();
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isOpen && filePath) {
      getFileUrl();
    } else if (!isOpen) {
      // Reset state when modal closes
      setFileUrl(null);
      setLoading(true);
      setError(null);
      setZoom(1);
      setRotation(0);
      setImageLoaded(false);
      setPanOffset({ x: 0, y: 0 });
      setIsPanning(false);
      setIsFullscreen(false);
    }
  }, [isOpen, filePath]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      const canPreviewFile =
        fileType.includes("pdf") || fileType.includes("image");
      if (!canPreviewFile) return;

      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault();
          handleZoomIn();
          break;
        case "0":
          event.preventDefault();
          handleResetZoom();
          break;
        case "r":
          if (fileType.includes("image")) {
            event.preventDefault();
            handleRotate();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, fileType, zoom]);

  const getFileUrl = async () => {
    if (!supabase || !filePath) {
      setError("Invalid file path");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = supabase.storage
        .from("job-attachments")
        .getPublicUrl(filePath);

      if (error) throw error;

      setFileUrl(data.publicUrl);
    } catch (err) {
      console.error("Error getting file URL:", err);
      setError("Failed to load file");
    } finally {
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!fileType.includes("image")) return;
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !fileType.includes("image")) return;
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    setPanOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const canPreviewFile = fileType.includes("pdf") || fileType.includes("image");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-1 sm:p-2 bg-black bg-opacity-75">
      <div className="bg-white rounded-lg w-full h-full max-w-full max-h-full sm:max-w-7xl sm:max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-2 sm:p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 flex-shrink-0" />
            <h3 className="text-sm sm:text-lg font-semibold truncate">
              {fileName}
            </h3>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {canPreviewFile && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-1 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Zoom Out (-)"
                >
                  <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4 rotate-180" />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-1 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                  title="Reset Zoom (0)"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                {fileType.includes("image") && (
                  <button
                    onClick={handleRotate}
                    className="p-1 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    title="Rotate (R)"
                  >
                    <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => window.open(fileUrl, "_blank")}
              className="p-1 sm:p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              title="Download"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => window.open(fileUrl, "_blank")}
              className="p-1 sm:p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-1 sm:p-2">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <File className="h-12 w-12 mb-2" />
              <p className="text-lg font-medium mb-1">Error loading file</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : !canPreviewFile ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileText className="h-12 w-12 mb-2" />
              <p className="text-lg font-medium mb-1">Preview not available</p>
              <p className="text-sm mb-4">
                This file type cannot be previewed in the browser
              </p>
              <button
                onClick={() => window.open(fileUrl, "_blank")}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Download className="h-4 w-4" />
                Download File
              </button>
            </div>
          ) : fileType.includes("pdf") ? (
            <div className="w-full h-full min-h-[600px]">
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                className="w-full h-full border-0"
                title={fileName}
              />
            </div>
          ) : fileType.includes("image") ? (
            <div
              className="w-full h-full min-h-[600px] flex items-center justify-center overflow-hidden cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <img
                src={fileUrl || ""}
                alt={fileName}
                className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
                }}
                onLoad={handleImageLoad}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {canPreviewFile && (
          <div className="p-2 sm:p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
              <span>Zoom: {Math.round(zoom * 100)}%</span>
              {fileType.includes("image") && <span>Rotation: {rotation}°</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAttachmentModal;
