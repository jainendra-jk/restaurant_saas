export interface ValidationResult {
  valid: boolean;
  message: string;
}

const validators: Record<string, (value: string) => ValidationResult> = {
  restaurantName: (v) => {
    if (!v.trim()) return { valid: false, message: "Restaurant name is required" };
    if (v.trim().length < 2) return { valid: false, message: "Name must be at least 2 characters" };
    return { valid: true, message: "" };
  },
  ownerName: (v) => {
    if (!v.trim()) return { valid: false, message: "Your name is required" };
    if (v.trim().length < 2) return { valid: false, message: "Name must be at least 2 characters" };
    return { valid: true, message: "" };
  },
  phone: (v) => {
    if (!v.trim()) return { valid: false, message: "Phone number is required" };
    const cleaned = v.replace(/[\s\-\+\(\)]/g, "");
    if (!/^\d{10,13}$/.test(cleaned)) return { valid: false, message: "Enter a valid 10-digit phone number" };
    return { valid: true, message: "" };
  },
  email: (v) => {
    if (!v.trim()) return { valid: false, message: "Email is required" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return { valid: false, message: "Enter a valid email address" };
    return { valid: true, message: "" };
  },
  address: (v) => {
    if (!v.trim()) return { valid: false, message: "Address is required" };
    if (v.trim().length < 5) return { valid: false, message: "Enter a complete address" };
    return { valid: true, message: "" };
  },
  city: (v) => {
    if (!v.trim()) return { valid: false, message: "City is required" };
    return { valid: true, message: "" };
  },
  state: (v) => {
    if (!v.trim()) return { valid: false, message: "State is required" };
    return { valid: true, message: "" };
  },
  pincode: (v) => {
    if (!v.trim()) return { valid: false, message: "Pincode is required" };
    if (!/^\d{6}$/.test(v.trim())) return { valid: false, message: "Enter a valid 6-digit pincode" };
    return { valid: true, message: "" };
  },
  gstNumber: (v) => {
    if (!v.trim()) return { valid: true, message: "" }; // optional
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/i.test(v.trim()))
      return { valid: false, message: "Enter a valid 15-character GST number" };
    return { valid: true, message: "" };
  },
  fssaiNumber: (v) => {
    if (!v.trim()) return { valid: true, message: "" }; // optional
    if (!/^\d{14}$/.test(v.trim())) return { valid: false, message: "FSSAI number must be 14 digits" };
    return { valid: true, message: "" };
  },
  tables: (v) => {
    if (!v.trim()) return { valid: false, message: "Please enter the number of tables" };
    const num = parseInt(v.trim());
    if (isNaN(num) || num < 1) return { valid: false, message: "Must be at least 1 table" };
    if (num > 999) return { valid: false, message: "Maximum 999 tables allowed" };
    return { valid: true, message: "" };
  },
  username: (v) => {
    if (!v.trim()) return { valid: false, message: "Username is required" };
    if (v.trim().length < 4) return { valid: false, message: "Username must be at least 4 characters" };
    if (!/^[a-zA-Z0-9_]+$/.test(v.trim())) return { valid: false, message: "Only letters, numbers, and underscores" };
    return { valid: true, message: "" };
  },
  password: (v) => {
    if (!v) return { valid: false, message: "Password is required" };
    if (v.length < 8) return { valid: false, message: "Password must be at least 8 characters" };
    if (!/[A-Z]/.test(v)) return { valid: false, message: "Include at least one uppercase letter" };
    if (!/[0-9]/.test(v)) return { valid: false, message: "Include at least one number" };
    return { valid: true, message: "" };
  },
  domain: (v) => {
    if (!v.trim()) return { valid: false, message: "Domain is required" };
    if (v.trim().length < 3) return { valid: false, message: "Domain must be at least 3 characters" };
    return { valid: true, message: "" };
  },
};

export function validate(fieldKey: string, value: string): ValidationResult {
  const validator = validators[fieldKey];
  if (!validator) return { valid: true, message: "" };
  return validator(value);
}