import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, FileText, CheckCircle2, ChevronRight, PenLine, AlertCircle } from "lucide-react";

interface MenuUploadProps {
  onNext: () => void;
  direction: number;
}

export function MenuUpload({ onNext, direction }: MenuUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidPdf = (file: File) => {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  };

  const simulateUpload = (file: File) => {
    if (!isValidPdf(file)) {
      setUploadError("Only PDF files are accepted. Please upload a .pdf file.");
      return;
    }
    setUploadError("");
    setIsUploading(true);
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setIsUploading(false);
        setUploadedFile(file.name);
      }
      setUploadProgress(Math.min(progress, 100));
    }, 200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) simulateUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file);
  };

  return (
    <motion.div
      initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <div className="space-y-5">
        <div>
          <label className="text-gray-800">Upload Your Menu</label>
          <p className="text-sm text-gray-400 mt-1">
            PDF format only. We'll digitize it for you.
          </p>
        </div>

        {!uploadedFile ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="relative rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
              style={{
                borderColor: isDragging ? "#f97316" : "#e5e7eb",
                backgroundColor: isDragging ? "rgba(249, 115, 22, 0.04)" : "#fafafa",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3 w-full">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(249, 115, 22, 0.1)" }}>
                    <FileText className="w-6 h-6" style={{ color: "#f97316" }} />
                  </div>
                  <p className="text-sm text-gray-500">Uploading...</p>
                  <div className="w-full max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: "#f97316" }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: "rgba(249, 115, 22, 0.08)" }}>
                    <Upload className="w-6 h-6" style={{ color: "#f97316" }} />
                  </div>
                  <p className="text-gray-700 mb-1">
                    Drop your menu here
                  </p>
                  <p className="text-sm text-gray-400">
                    or click to browse
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">PDF</span>
                  </div>
                </>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-500 mt-2">
                <AlertCircle className="w-4 h-4" />
                {uploadError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              onClick={onNext}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
            >
              <PenLine className="w-4 h-4" />
              Enter Menu Manually
            </button>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-5"
          >
            <div className="rounded-2xl border border-green-200 bg-green-50/50 p-6 flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
              >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </motion.div>
              <p className="text-green-700">Upload successful!</p>
              <p className="text-sm text-green-600/70 truncate max-w-full">{uploadedFile}</p>
            </div>

            <button
              onClick={onNext}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: "#f97316" }}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}