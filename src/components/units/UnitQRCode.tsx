import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Share2, Info } from "lucide-react";

interface UnitQRCodeProps {
  unitId: string;
  unitNumber: string;
}

const UnitQRCode = ({ unitId, unitNumber }: UnitQRCodeProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const baseUrl = window.location.origin;
  const unitUrl = `${baseUrl}/units/public/${unitId}`;

  const handleDownloadSVG = () => {
    const svg = document.querySelector<SVGSVGElement>("#unit-qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Unit-${unitNumber}-QRCode.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Unit ${unitNumber} QR Code`,
          text: `Scan this QR code to view location, equipment, and service details for Unit ${unitNumber}`,
          url: unitUrl,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(unitUrl);
      alert("URL copied to clipboard!");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Unit QR Code</h3>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="text-gray-500 hover:text-gray-700"
        >
          <Info size={18} />
        </button>
      </div>
      {showInfo && (
        <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-700">
          <p>
            This QR code provides quick access to this unit's complete
            information including location details, assets, and service history.
            Anyone can scan this code to view comprehensive suite information
            without needing to log in.
          </p>
          <p className="mt-2">
            Use this for maintenance tags, equipment labels, or sharing with
            contractors and service providers.
          </p>
        </div>
      )}
      <div className="flex flex-col items-center">
        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
          <QRCodeSVG
            id="unit-qr-code-svg"
            value={unitUrl}
            size={200}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "https://media.licdn.com/dms/image/v2/D560BAQFYGSq9fkNHsA/company-logo_200_200/company-logo_200_200/0/1692026875749/airlast_logo?e=1756339200&v=beta&t=nQtqaAkbHqqI_eyWONgSIo097_pUkn3MEGIAM1KO4l0",
              height: 40,
              width: 40,
              excavate: true,
            }}
          />
        </div>
        <div className="text-center mb-4">
          <p className="text-sm text-gray-500">
            Scan to view Unit {unitNumber} details, location & assets
          </p>
          <p className="text-xs text-gray-400 mt-1">{unitUrl}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadSVG}
            className="btn btn-secondary flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download SVG
          </button>
          <button
            onClick={handleShare}
            className="btn btn-primary flex items-center"
          >
            <Share2 size={16} className="mr-2" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnitQRCode;
