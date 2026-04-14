import { useState, useCallback, useRef, useEffect } from 'react';
import { CreditCard, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { SliderShell } from './ui/SliderShell';
import { SectionHeader } from './ui/SectionHeader';
import { FormField } from './ui/FormField';
import { SaveButton } from './ui/SaveButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { useMenuConfig } from '../context/MenuConfigContext';
import {
  usePayment,
  type PaymentDetails,
  type PaymentMode,
  type Currency,
  type PrimaryGateway,
  ensurePrimaryValid,
  getActiveGateways,
} from '../context/PaymentContext';
import { StripePoweredByBadge } from './StripePoweredByBadge';

/** Input with optional copy button; same styling as FormField. */
function FieldWithCopy({
  label,
  value,
  onChange,
  placeholder,
  copyable,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="border-b border-gray-50 last:border-0">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-2 pb-2.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
        />
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            title="Copy"
          >
            {copied ? <Check className="w-4 h-4 text-status-served" /> : <Copy className="w-4 h-4 text-gray-400" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Settlement account: editable input with reveal (password/text) and copy. */
// (Removed legacy settlement/bank fields for gateway-based integrations)

function StatusBadge({
  tone,
  label,
}: {
  tone: 'active' | 'inactive';
  label: string;
}) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full border ${
        tone === 'active'
          ? 'bg-status-served-light text-status-served border-status-served/10'
          : 'bg-gray-100 text-gray-500 border-gray-200'
      }`}
    >
      {label}
    </span>
  );
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="border-b border-gray-50 last:border-0">
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <div className="flex items-center gap-2 pb-2.5">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-mono"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          title={revealed ? 'Hide' : 'Show'}
        >
          {revealed ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
        </button>
      </div>
    </div>
  );
}

interface PaymentsSliderProps {
  onClose: () => void;
}

const TAB_PAY_AT_TABLE: PaymentMode = 'pay_at_table';
const TAB_MERCHANT: PaymentMode = 'merchant';

export function PaymentsSlider({ onClose }: PaymentsSliderProps) {
  const { branding } = useMenuConfig();
  const { paymentDetails: initial, savePayment, paymentMode, setPaymentMode } = usePayment();
  const [details, setDetails] = useState<PaymentDetails>(() => initial);
  const sliderBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (paymentMode === TAB_MERCHANT) {
      sliderBodyRef.current?.scrollTo({ top: 0 });
    }
  }, [paymentMode]);

  const updateTop = useCallback((key: 'restaurantName' | 'currency') => (value: string | Currency) => {
    setDetails((prev) => ({ ...prev, [key]: value as never }));
  }, []);

  const handleSave = useCallback(() => {
    if (paymentMode === TAB_PAY_AT_TABLE) {
      // Persist selection even if merchant fields are empty.
      setPaymentMode(TAB_PAY_AT_TABLE);
      onClose();
      return;
    }

    // Merchant mode: persist details as-is (validation is handled per-gateway + primary selection constraints).
    savePayment(ensurePrimaryValid(details));
    onClose();
  }, [details, savePayment, onClose, paymentMode, setPaymentMode]);

  const isMerchantTab = paymentMode === TAB_MERCHANT;
  const activeGateways = getActiveGateways(details);
  const primaryOptions = activeGateways;
  const primaryValue = details.primary ?? '';
  const canSaveMerchant = true;

  return (
    <SliderShell
      icon={<CreditCard className="w-5 h-5 text-primary" />}
      iconBg="bg-primary/10"
      title="Payments"
      subtitle={isMerchantTab ? 'Merchant & payment details' : 'Pay at the table'}
      onClose={onClose}
      bodyRef={sliderBodyRef}
      footer={
        <SaveButton
          label="Save Payment Settings"
          onSave={handleSave}
          savedLabel="Saved"
          disabled={paymentMode === TAB_MERCHANT ? true : false}
        />
      }
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          type="button"
          onClick={() => setPaymentMode(TAB_PAY_AT_TABLE)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            paymentMode === TAB_PAY_AT_TABLE
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Pay at the table
        </button>
        <button
          type="button"
          onClick={() => setPaymentMode(TAB_MERCHANT)}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            paymentMode === TAB_MERCHANT
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Merchant integration
        </button>
      </div>

      {paymentMode === TAB_PAY_AT_TABLE ? (
        <div className="bg-gray-50/50 rounded-xl p-4 space-y-3">
          <p className="text-sm text-gray-700">
            Payment will be collected at the table (e.g. cash or card when the customer pays at the end of the meal).
            No merchant ID, UPI, or payment gateway setup is required.
          </p>
          <p className="text-xs text-gray-500">
            You can switch to &quot;Merchant integration&quot; anytime to accept online payments via UPI or payment gateway.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="pointer-events-none opacity-60 blur-[1px]">
          {/* Top fields */}
          <div className="bg-gray-50/50 rounded-xl p-3 space-y-3 mb-4">
            <div className="border-b border-gray-50 last:border-0">
              <label className="block text-xs text-gray-400 mb-1">Merchant ID</label>
              <div className="flex items-center gap-2 pb-2.5">
                <input
                  type="text"
                  value={details.merchantId}
                  readOnly
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(details.merchantId)}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                  title="Copy"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            <FormField
              label="Restaurant Name"
              value={details.restaurantName}
              onChange={updateTop('restaurantName')}
              placeholder={branding.restaurantName}
            />

            <div className="border-b border-gray-50 last:border-0">
              <label className="block text-xs text-gray-400 mb-1">Currency</label>
              <div className="pb-2.5">
                <Select
                  value={details.currency}
                  onValueChange={(v) => updateTop('currency')(v as Currency)}
                >
                  <SelectTrigger className="w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary/30 focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-md">
                    <SelectItem value="INR" className="rounded-lg focus:bg-primary/10 focus:text-primary">
                      INR
                    </SelectItem>
                    <SelectItem value="USD" className="rounded-lg focus:bg-primary/10 focus:text-primary">
                      USD
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Primary gateway selector */}
          <div className="bg-gray-50/50 rounded-xl p-3 mb-4">
            <label className="block text-xs text-gray-400 mb-1">Primary Gateway</label>
            <Select
              value={primaryValue}
              onValueChange={(v) => {
                const next = (v || null) as PrimaryGateway;
                setDetails((prev) => ensurePrimaryValid({ ...prev, primary: next }));
              }}
            >
              <SelectTrigger
                className="w-full rounded-xl border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <SelectValue placeholder={activeGateways.length ? 'Select primary gateway' : 'Enable a gateway first'} />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-md">
                {primaryOptions.map((g) => (
                  <SelectItem
                    key={g}
                    value={g}
                    className="rounded-lg focus:bg-primary/10 focus:text-primary"
                  >
                    {g === 'razorpay' ? 'Razorpay' : g === 'stripe' ? 'Stripe' : 'UPI'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeGateways.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">Connect a gateway (Razorpay/Stripe) or enable UPI to select a primary gateway.</p>
            )}
          </div>

          {/* Razorpay */}
          <div className="bg-gray-50/50 rounded-xl p-4 mb-4 relative">
            <div className="flex items-start justify-between mb-3">
              <SectionHeader label="Razorpay" />
              <StatusBadge tone={details.razorpay.connected ? 'active' : 'inactive'} label={details.razorpay.connected ? 'Active' : 'Not Connected'} />
            </div>
            <div className="space-y-0">
              <FormField
                label="Key ID"
                value={details.razorpay.keyId}
                onChange={(v) => setDetails((prev) => ({ ...prev, razorpay: { ...prev.razorpay, keyId: v } }))}
                placeholder="rzp_live_..."
              />
              <SecretField
                label="Key Secret"
                value={details.razorpay.keySecret}
                onChange={(v) => setDetails((prev) => ({ ...prev, razorpay: { ...prev.razorpay, keySecret: v } }))}
                placeholder="********"
              />
              <SecretField
                label="Webhook Secret"
                value={details.razorpay.webhookSecret}
                onChange={(v) => setDetails((prev) => ({ ...prev, razorpay: { ...prev.razorpay, webhookSecret: v } }))}
                placeholder="********"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={details.razorpay.connected || !details.razorpay.keyId.trim() || !details.razorpay.keySecret.trim() || !details.razorpay.webhookSecret.trim()}
                onClick={() =>
                  setDetails((prev) =>
                    ensurePrimaryValid({ ...prev, razorpay: { ...prev.razorpay, connected: true } })
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-primary text-white hover:brightness-90 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Connect
              </button>
              <button
                type="button"
                disabled={!details.razorpay.connected}
                onClick={() =>
                  setDetails((prev) =>
                    ensurePrimaryValid({ ...prev, razorpay: { ...prev.razorpay, connected: false } })
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Stripe */}
          <div className="bg-gray-50/50 rounded-xl p-4 pb-11 mb-4 relative">
            <div className="flex items-start justify-between gap-2 mb-3">
              <SectionHeader label="Stripe" />
              <StatusBadge tone={details.stripe.connected ? 'active' : 'inactive'} label={details.stripe.connected ? 'Active' : 'Not Connected'} />
            </div>
            <div className="space-y-0">
              <FormField
                label="Publishable Key"
                value={details.stripe.publishableKey}
                onChange={(v) => setDetails((prev) => ({ ...prev, stripe: { ...prev.stripe, publishableKey: v } }))}
                placeholder="pk_live_..."
              />
              <SecretField
                label="Secret Key"
                value={details.stripe.secretKey}
                onChange={(v) => setDetails((prev) => ({ ...prev, stripe: { ...prev.stripe, secretKey: v } }))}
                placeholder="********"
              />
              <SecretField
                label="Webhook Secret"
                value={details.stripe.webhookSecret}
                onChange={(v) => setDetails((prev) => ({ ...prev, stripe: { ...prev.stripe, webhookSecret: v } }))}
                placeholder="********"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={details.stripe.connected || !details.stripe.publishableKey.trim() || !details.stripe.secretKey.trim() || !details.stripe.webhookSecret.trim()}
                onClick={() =>
                  setDetails((prev) =>
                    ensurePrimaryValid({ ...prev, stripe: { ...prev.stripe, connected: true } })
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-primary text-white hover:brightness-90 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Connect
              </button>
              <button
                type="button"
                disabled={!details.stripe.connected}
                onClick={() =>
                  setDetails((prev) =>
                    ensurePrimaryValid({ ...prev, stripe: { ...prev.stripe, connected: false } })
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Disconnect
              </button>
            </div>
            <div className="absolute bottom-3 right-4">
              <StripePoweredByBadge />
            </div>
          </div>

          {/* UPI */}
          <div className="bg-gray-50/50 rounded-xl p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <SectionHeader label="UPI" />
              <StatusBadge tone={details.upi.enabled ? 'active' : 'inactive'} label={details.upi.enabled ? 'Enabled' : 'Disabled'} />
            </div>
            <div className="space-y-0">
              <FormField
                label="UPI ID (VPA)"
                value={details.upi.vpa}
                onChange={(v) => setDetails((prev) => ({ ...prev, upi: { ...prev.upi, vpa: v } }))}
                placeholder="merchant@bank"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                disabled={details.upi.enabled || !details.upi.vpa.trim()}
                onClick={() =>
                  setDetails((prev) =>
                    ensurePrimaryValid({ ...prev, upi: { ...prev.upi, enabled: true } })
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-primary text-white hover:brightness-90 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enable
              </button>
              <button
                type="button"
                disabled={!details.upi.enabled}
                onClick={() =>
                  setDetails((prev) =>
                    ensurePrimaryValid({ ...prev, upi: { ...prev.upi, enabled: false } })
                  )
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Disable
              </button>
            </div>
          </div>

          <div className="h-4" />
          </div>

          <div className="absolute inset-0 z-20 grid place-items-center bg-black/20">
            <div className="w-[90%] max-w-sm rounded-xl bg-white p-5 shadow-xl border border-gray-100 text-center">
              <h3 className="text-gray-900">Merchant integration — Coming soon</h3>
              <p className="text-sm text-gray-500 mt-1">This feature will be available soon.</p>
            </div>
          </div>
        </div>
      )}
    </SliderShell>
  );
}
