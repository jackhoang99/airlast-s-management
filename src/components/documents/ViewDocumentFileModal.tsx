import React, { useState, useEffect } from "react";
import { useSupabase } from "../../lib/supabase-context";
import { Database } from "../../types/supabase";
import {
  FileCheck,
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

type LocationDocument =
  Database["public"]["Tables"]["location_documents"]["Row"];
type UnitDocument = Database["public"]["Tables"]["unit_documents"]["Row"];

interface ViewDocumentFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: LocationDocument | UnitDocument;
  documentType: "location" | "unit";
}

const ViewDocumentFileModal: React.FC<ViewDocumentFileModalProps> = ({
  isOpen,
  onClose,
  documentData,
  documentType,
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
    if (isOpen && documentData.file_path) {
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
  }, [isOpen, documentData.file_path]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      const canPreviewFile =
        documentData.file_type?.includes("pdf") ||
        documentData.file_type?.includes("image");
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
          if (documentData.file_type?.includes("image")) {
            event.preventDefault();
            handleRotate();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, documentData.file_type, zoom]);

  const getFileUrl = async () => {
    if (!supabase || !documentData.file_path) {
      setError("Invalid file path");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bucketName =
        documentType === "location" ? "location-documents" : "unit-documents";
      const { data, error: urlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(documentData.file_path, 3600); // 1 hour expiry

      if (urlError) throw urlError;
      setFileUrl(data.signedUrl);
    } catch (err) {
      console.error("Error fetching file URL:", err);
      setError("Failed to load documentData. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (fileUrl && documentData.file_name) {
      try {
        // Simple download approach
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Failed to fetch file");

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = documentData.file_name;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Download error:", err);
        // Fallback to opening in new tab
        window.open(fileUrl, "_blank");
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
    } else {
      // For fullscreen, we'll use the browser's fullscreen API
      const modalElement = document.querySelector(".modal-fullscreen");
      if (modalElement) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          modalElement.requestFullscreen().catch((err) => {
            console.log("Fullscreen failed:", err);
            // Fallback to our custom fullscreen
            setIsFullscreen(true);
          });
        }
      } else {
        setIsFullscreen(true);
      }
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
    setImageLoaded(false);
    setPanOffset({ x: 0, y: 0 });
    setIsFullscreen(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;

      setPanOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = () => {
    if (documentData.file_type?.includes("pdf")) return "";
    if (documentData.file_type?.includes("image")) return "";
    if (
      documentData.file_type?.includes("word") ||
      documentData.file_type?.includes("document")
    )
      return "";
    return "📎";
  };

  const getFileIconComponent = () => {
    if (documentData.file_type?.includes("pdf")) return FileText;
    if (documentData.file_type?.includes("image")) return Image;
    if (
      documentData.file_type?.includes("word") ||
      documentData.file_type?.includes("document")
    )
      return FileText;
    return File;
  };

  const canPreview = () => {
    return (
      documentData.file_type?.includes("pdf") ||
      documentData.file_type?.includes("image")
    );
  };

  if (!isOpen) return null;

  // Defensive check for required props
  if (
    !documentData.file_path ||
    !documentData.file_name ||
    !documentData.file_type
  ) {
    console.error("Missing required props:", {
      filePath: documentData.file_path,
      fileName: documentData.file_name,
      fileType: documentData.file_type,
    });
    return null;
  }

  try {
    return (
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 transition-all duration-300 modal-fullscreen ${
          isFullscreen
            ? "bg-opacity-90"
            : "flex items-center justify-center p-2 sm:p-4"
        }`}
      >
        <div
          className={`bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300 ${
            isFullscreen
              ? "fixed inset-0 max-w-none max-h-none w-full h-full rounded-none"
              : "max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <FileCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {documentData.file_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {getFileIcon()} {documentData.file_type}
                  {canPreview() && !documentData.file_type?.includes("pdf") && (
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                      {Math.round(zoom * 100)}%
                    </span>
                  )}
                  {documentData.file_type?.includes("image") && zoom > 1 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Click & drag to pan
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Download button - always visible */}
              <button
                onClick={handleDownload}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Open in new tab button - always visible */}
              <button
                onClick={() => fileUrl && window.open(fileUrl, "_blank")}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Zoom controls - only for previewable files */}
              {canPreview() && (
                <>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 3}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Reset zoom"
                  >
                    <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {documentData.file_type?.includes("image") && (
                    <button
                      onClick={handleRotate}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Rotate image"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </>
              )}

              {/* Close button - always visible */}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className={`overflow-hidden ${
              isFullscreen ? "h-[calc(100vh-80px)]" : "flex-1"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileCheck className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Failed to load file
                  </h3>
                  <p className="text-gray-500">{error}</p>
                </div>
              </div>
            ) : (
              <div className="h-full">
                {canPreview() ? (
                  <div className="h-full">
                    {documentData.file_type?.includes("pdf") ? (
                      <div className="flex items-center justify-center h-full bg-gray-50">
                        <div className="text-center max-w-md mx-auto p-8">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-8 h-8 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">
                            PDF Document
                          </h3>
                          <p className="text-gray-500 mb-6">
                            For the best viewing experience, please open this
                            PDF in a new tab using the button above.
                          </p>
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={() =>
                                fileUrl && window.open(fileUrl, "_blank")
                              }
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open in New Tab
                            </button>
                            <button
                              onClick={handleDownload}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : documentData.file_type?.includes("image") ? (
                      <div
                        className={`flex items-center justify-center bg-gray-50 overflow-auto ${
                          isFullscreen ? "h-full" : "h-full p-4"
                        }`}
                        style={{
                          cursor:
                            zoom > 1
                              ? isPanning
                                ? "grabbing"
                                : "grab"
                              : "default",
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className="transition-transform duration-200 ease-in-out"
                          style={{
                            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panOffset.x}px, ${panOffset.y}px)`,
                            transformOrigin: "center center",
                          }}
                        >
                          <img
                            src={fileUrl || ""}
                            alt={documentData.file_name}
                            className="object-contain"
                            style={{
                              maxWidth: zoom === 1 ? "100%" : "none",
                              maxHeight: zoom === 1 ? "100%" : "none",
                              width: zoom === 1 ? "auto" : "auto",
                              height: zoom === 1 ? "auto" : "auto",
                              pointerEvents: "none",
                            }}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setError("Failed to load image")}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileCheck className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Preview not available
                          </h3>
                          <p className="text-gray-500 mb-4">
                            This file type cannot be previewed directly.
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={handleDownload}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                            <button
                              onClick={handleOpenInNewTab}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileCheck className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Preview not available
                      </h3>
                      <p className="text-gray-500 mb-4">
                        This file type cannot be previewed directly.
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleDownload}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button
                          onClick={handleOpenInNewTab}
                          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering ViewDocumentFileModal:", error);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error Loading File Viewer
            </h3>
            <p className="text-gray-500 mb-4">
              An error occurred while loading the file viewer.
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default ViewDocumentFileModal;
