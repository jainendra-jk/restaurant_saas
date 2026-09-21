import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v?.trim() || undefined;
}

/**
 * Escape a caller-supplied value before it is interpolated into the email HTML.
 * Every field of the request body reaches the template, so without this an
 * unauthenticated caller could inject arbitrary markup (including links) into a
 * mail sent from the verified Ratolabs domain.
 */
function esc(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  return value
    .slice(0, MAX_FIELD_LEN)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MAX_FIELD_LEN = 200;

/** Only same-origin-ish absolute http(s) URLs may become the CTA href. */
function safeHttpUrl(value: string | undefined): string {
  const raw = value?.trim().replace(/\/+$/, "") ?? "";
  if (!raw) return "";
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.origin + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return "";
  }
}

/** Resolve the caller's Supabase user from the Authorization header. */
async function getUserFromRequest(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token) return null;
  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  const { data, error } = await createClient(url, anon).auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

interface WelcomeEmailBody {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  tables: string;
  restaurantSlug?: string;
  adminDashboardOrigin?: string;
}

function row(label: string, value: string | undefined): string {
  if (!value?.trim()) return "";
  return `
    <tr>
      <td class="row-label" style="padding:10px 12px;font-size:12px;color:#6b7280;font-weight:600;white-space:nowrap;width:38%;vertical-align:top;">${label}</td>
      <td class="row-value" style="padding:10px 12px;font-size:13px;color:#111827;vertical-align:top;word-break:break-word;width:62%;">${value}</td>
    </tr>`;
}

function buildHtml(body: WelcomeEmailBody): string {
  // Escape once, here, so no interpolation site below can forget to.
  const restaurantName = esc(body.restaurantName) ?? "";
  const ownerName = esc(body.ownerName) ?? "";
  const email = esc(body.email);
  const phone = esc(body.phone);
  const address = esc(body.address);
  const gstNumber = esc(body.gstNumber);
  const fssaiNumber = esc(body.fssaiNumber);
  const restaurantSlug = esc(body.restaurantSlug);

  const tableCount = parseInt(body.tables, 10) || 0;
  const locationParts = esc(
    [body.city, body.state, body.pincode].filter(Boolean).join(", "),
  );

  const dashboardUrl = safeHttpUrl(body.adminDashboardOrigin);
  const dashboardBtn = dashboardUrl
    ? `
    <tr>
      <td class="cta-td" align="center" style="padding:32px 0 8px;">
        <a href="${dashboardUrl}" class="cta-btn"
          style="display:inline-block;background:#f97316;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.01em;">
          Open Dashboard
        </a>
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Your restaurant is live on Ratolabs</title>
  <style>
    @media only screen and (max-width: 480px) {
      .outer-td { padding: 16px 8px !important; }
      .card { border-radius: 10px !important; }
      .header-td { padding: 24px 20px 20px !important; }
      .header-td h1 { font-size: 20px !important; }
      .header-td p { font-size: 13px !important; }
      .details-td { padding: 16px 14px 8px !important; }
      .row-label { padding: 8px 10px !important; font-size: 11px !important; width: 36% !important; }
      .row-value { padding: 8px 10px !important; font-size: 12px !important; width: 64% !important; }
      .cta-td { padding: 20px 0 8px !important; }
      .cta-btn { padding: 12px 28px !important; font-size: 14px !important; border-radius: 8px !important; }
      .divider-td { padding: 16px 20px 0 !important; }
      .footer-td { padding: 16px 20px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td class="outer-td" align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Orange header banner -->
          <tr>
            <td class="header-td" style="background:linear-gradient(135deg,#fb923c,#f97316);padding:36px 32px 28px;">
              <img src="https://ighjfqgelxjskiltznov.supabase.co/storage/v1/object/public/Assets/logo.png" alt="Ratolabs" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border-radius:10px;margin-bottom:20px;" />
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;">Your restaurant is live!</h1>
              <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">
                Hi ${ownerName}, <strong>${restaurantName}</strong> has been set up successfully. Here's a summary of your account details.
              </p>
            </td>
          </tr>

          <!-- Details section -->
          <tr>
            <td class="details-td" style="padding:24px 24px 8px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f97316;">Restaurant Details</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:10px;border:1px solid #f3f4f6;overflow:hidden;">
                ${row("Restaurant", restaurantName)}
                ${row("Owner", ownerName)}
                ${row("Login Email", email)}
                ${row("Phone", phone)}
                ${row("Address", address)}
                ${row("Location", locationParts)}
                ${row("Tables", tableCount ? `${tableCount} tables` : undefined)}
                ${row("Slug", restaurantSlug)}
                ${gstNumber ? row("GST Number", gstNumber) : ""}
                ${fssaiNumber ? row("FSSAI Number", fssaiNumber) : ""}
              </table>
            </td>
          </tr>

          <!-- Dashboard CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            ${dashboardBtn}
          </table>

          <!-- Divider -->
          <tr>
            <td class="divider-td" style="padding:24px 32px 0;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-td" style="padding:20px 32px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This email was sent by <strong style="color:#f97316;">Ratolabs</strong> because you completed restaurant onboarding.<br />
                If you did not sign up, please ignore this email or contact support.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Without this check the function is an open relay: anyone could send
  // attacker-authored mail from the verified Ratolabs sending domain to any
  // address. The only caller (onboarding) invokes it after a successful signup,
  // so supabase-js always attaches the user's session JWT here.
  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const resendApiKey = env("RESEND_API_KEY");
  const fromEmail = env("RESEND_FROM_EMAIL") ?? "noreply@ratolabs.com";

  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY is not configured" }, 503);
  }

  let body: WelcomeEmailBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const recipient = body.email?.trim() ?? "";
  if (!recipient || !body.restaurantName?.trim()) {
    return jsonResponse({ error: "email and restaurantName are required" }, 400);
  }
  if (recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return jsonResponse({ error: "Invalid email" }, 400);
  }

  const html = buildHtml(body);

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipient],
      subject: `Your restaurant "${body.restaurantName.trim().slice(0, 120)}" is live on Ratolabs!`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const errText = await resendRes.text().catch(() => "unknown error");
    console.error("Resend API error:", resendRes.status, errText);
    return jsonResponse(
      { error: `Failed to send email: ${resendRes.status}` },
      502,
    );
  }

  return jsonResponse({ sent: true });
});
