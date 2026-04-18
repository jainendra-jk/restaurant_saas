import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v?.trim() || undefined;
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
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;font-weight:600;white-space:nowrap;width:160px;vertical-align:top;">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#111827;vertical-align:top;word-break:break-word;">${value}</td>
    </tr>`;
}

function buildHtml(body: WelcomeEmailBody): string {
  const {
    restaurantName,
    ownerName,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    gstNumber,
    fssaiNumber,
    tables,
    restaurantSlug,
    adminDashboardOrigin,
  } = body;

  const tableCount = parseInt(tables, 10) || 0;
  const locationParts = [city, state, pincode].filter(Boolean).join(", ");

  const dashboardUrl = adminDashboardOrigin?.trim().replace(/\/+$/, "") || "";
  const dashboardBtn = dashboardUrl
    ? `
    <tr>
      <td align="center" style="padding:32px 0 8px;">
        <a href="${dashboardUrl}"
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
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

          <!-- Orange header banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#fb923c,#f97316);padding:36px 32px 28px;">
              <img src="https://ighjfqgelxjskiltznov.supabase.co/storage/v1/object/public/Assets/logo.png" alt="Ratolabs" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain;border-radius:10px;margin-bottom:20px;" />
              <h1 style="margin:0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.25;">Your restaurant is live!</h1>
              <p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.9);">
                Hi ${ownerName}, <strong>${restaurantName}</strong> has been set up successfully. Here's a summary of your account details.
              </p>
            </td>
          </tr>

          <!-- Details section -->
          <tr>
            <td style="padding:24px 24px 8px;">
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
            <td style="padding:24px 32px 0;">
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 32px;text-align:center;">
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

  if (!body.email?.trim() || !body.restaurantName?.trim()) {
    return jsonResponse({ error: "email and restaurantName are required" }, 400);
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
      to: [body.email.trim()],
      subject: `Your restaurant "${body.restaurantName}" is live on Ratolabs!`,
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
