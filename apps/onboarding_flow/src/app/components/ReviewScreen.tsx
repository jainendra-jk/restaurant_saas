import { motion } from "motion/react";
import { Pencil, Store, User, Phone, Mail, MapPin, Building2, Hash, FileText, ShieldCheck, Lock, LayoutGrid, CheckCircle2, Loader2 } from "lucide-react";

interface FormData {
  restaurantName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  fssaiNumber: string;
  tables: string;
  password: string;
}

interface ReviewScreenProps {
  formData: FormData;
  menuPdfFileName?: string | null;
  onConfirm: () => void | Promise<void>;
  onEdit: (step: number, subStep: number) => void;
  isSubmitting?: boolean;
}

const sections = [
  {
    title: "Restaurant Details",
    step: 1,
    fields: [
      { key: "restaurantName", label: "Restaurant Name", icon: Store, subStep: 0 },
      { key: "ownerName", label: "Owner Name", icon: User, subStep: 1 },
      { key: "phone", label: "Phone", icon: Phone, subStep: 2 },
      { key: "email", label: "Email", icon: Mail, subStep: 3 },
      { key: "address", label: "Address", icon: MapPin, subStep: 4 },
      { key: "city", label: "City", icon: Building2, subStep: 5 },
      { key: "state", label: "State", icon: Building2, subStep: 6 },
      { key: "pincode", label: "Pincode", icon: Hash, subStep: 7 },
      { key: "gstNumber", label: "GST Number", icon: FileText, subStep: 8, optional: true },
      { key: "fssaiNumber", label: "FSSAI Number", icon: ShieldCheck, subStep: 9, optional: true },
    ],
  },
  {
    title: "Dashboard Setup",
    step: 2,
    fields: [
      { key: "tables", label: "Tables", icon: LayoutGrid, subStep: 0 },
      { key: "password", label: "Password", icon: Lock, subStep: 1 },
    ],
  },
];

export function ReviewScreen({
  formData,
  menuPdfFileName,
  onConfirm,
  onEdit,
  isSubmitting,
}: ReviewScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-full"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center pb-1">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: "rgba(249, 115, 22, 0.1)" }}
          >
            <CheckCircle2 className="w-6 h-6" style={{ color: "#f97316" }} />
          </motion.div>
          <h2 className="text-gray-900">Review Your Details</h2>
          <p className="text-sm text-gray-400 mt-1">
            Make sure everything looks good before we set up your restaurant.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
          {sections.map((section, sIdx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + sIdx * 0.1 }}
            >
              <p
                className="text-xs uppercase tracking-wider mb-2 ml-1"
                style={{ color: "#f97316" }}
              >
                {section.title}
              </p>
              <div className="bg-gray-50/70 rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {section.fields.map((field) => {
                  const value = formData[field.key as keyof FormData];
                  const isEmpty = !value.trim();
                  const Icon = field.icon;

                  if (isEmpty && field.optional) return null;

                  return (
                    <div
                      key={field.key}
                      className="flex items-center gap-3 px-4 py-3 group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400">{field.label}</p>
                        <p className="text-gray-800 truncate">
                          {field.key === "password"
                            ? "••••••••"
                            : field.key === "tables"
                            ? `${value} tables`
                            : value || "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => onEdit(section.step, field.subStep)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + sections.length * 0.1 }}
          >
            <p
              className="text-xs uppercase tracking-wider mb-2 ml-1"
              style={{ color: "#f97316" }}
            >
              Menu
            </p>
            <div className="bg-gray-50/70 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 group">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Menu PDF</p>
                  <p className="text-gray-800 truncate">
                    {menuPdfFileName?.trim() ? menuPdfFileName : "—"}
                  </p>
                </div>
                <button
                  onClick={() => onEdit(3, 0)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-orange-500 hover:bg-orange-50 transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Confirm */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onConfirm()}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white cursor-pointer transition-shadow hover:shadow-lg hover:shadow-orange-200"
          style={{ backgroundColor: "#f97316" }}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          {isSubmitting ? "Setting up..." : "Confirm & Launch"}
        </motion.button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fff7ed;
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #fdba74, #f97316);
          border-radius: 999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #fb923c, #ea580c);
        }
      `}</style>
    </motion.div>
  );
}