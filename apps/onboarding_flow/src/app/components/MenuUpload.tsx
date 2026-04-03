import { useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from "lucide-react";

export type MenuImportStatus = "idle" | "importing" | "done" | "error";

interface MenuUploadProps {
  onNext: () => void;
  direction: number;
  menuPdfFile: File | null;
  onMenuPdfChange: (file: File | null) => void;
  importStatus?: MenuImportStatus;
  importError?: string | null;
  /** True when account exists but JWT is missing (e.g. email confirmation required). */
  needsSessionForImport?: boolean;
  /** API URL missing — import will not run until configured. */
  apiNotConfigured?: boolean;
}

export function MenuUpload({
  onNext,
  direction,
  menuPdfFile,
  onMenuPdfChange,
  importStatus = "idle",
  importError = null,
  needsSessionForImport = false,
  apiNotConfigured = false,
}: MenuUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_PDF_BYTES = 10 * 1024 * 1024;

  const isValidPdf = (file: File) => {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  };

  const setFile = (file: File | null) => {
    if (file && !isValidPdf(file)) {
      setUploadError("Only PDF files are accepted. Please upload a .pdf file.");
      onMenuPdfChange(null);
      return;
    }
    if (file && file.size > MAX_PDF_BYTES) {
      setUploadError("PDF too large. Max upload size is 10 MB.");
      onMenuPdfChange(null);
      return;
    }
    setUploadError("");
    onMenuPdfChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFile(file);
    e.target.value = "";
  };

  const clearFile = () => setFile(null);

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
            PDF required. We import your menu during final setup after you confirm details.
          </p>
        </div>

        {!menuPdfFile ? (
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
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

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
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-500 mt-2">
                <AlertCircle className="w-4 h-4" />
                {uploadError}
              </div>
            )}
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
              <p className="text-green-700">PDF selected</p>
              <p className="text-sm text-green-600/70 truncate max-w-full">{menuPdfFile.name}</p>
              <button
                type="button"
                onClick={clearFile}
                className="text-xs text-gray-500 underline hover:text-gray-700 cursor-pointer"
              >
                Remove file
              </button>
            </div>

            {apiNotConfigured && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Set <code className="text-[11px]">VITE_API_BASE_URL</code> and run the API to import from here; you can also import from the admin dashboard later.
              </p>
            )}
            {needsSessionForImport && !apiNotConfigured && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Confirm your email and sign in, then import your menu from the admin dashboard if it didn&apos;t complete here.
              </p>
            )}
            {importStatus === "importing" && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 py-1">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#f97316" }} />
                Importing menu from PDF…
              </div>
            )}
            {importStatus === "done" && (
              <p className="text-sm text-center text-green-600">Menu saved to your restaurant.</p>
            )}
            {importStatus === "error" && importError && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Try another PDF or check your connection, then open Review again to finish setup.
                </p>
              </div>
            )}

            <button
              type="button"
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
