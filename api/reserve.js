/**
 * LE GATSBY — /api/reserve (Vercel serverless function)
 *
 * Receives the reservation form as JSON, validates it, and emails it to the
 * restaurant through Resend (https://resend.com — free tier is enough).
 *
 * Required Vercel environment variables:
 *   RESEND_API_KEY     — API key from the Resend dashboard
 *   RESERVATION_EMAIL  — inbox that receives reservation requests
 * Optional:
 *   RESEND_FROM        — verified sender (default: onboarding@resend.dev,
 *                        which works out of the box on the free tier)
 *
 * If the key isn't configured yet, the route answers { sent: false } and the
 * front-end gracefully falls back to a prefilled WhatsApp message — so the
 * demo works from day one, before any account is created.
 */

const TIME_RE = /^(1[2-9]|2[0-3]):(00|30)$/; // 12:00 → 23:30, 30-min steps
const GUESTS_RE = /^([1-9]|1[01]|12\+)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validate(body) {
  const errors = [];
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = String(body.email || "").trim();
  const date = String(body.date || "").trim();
  const time = String(body.time || "").trim();
  const guests = String(body.guests || "").trim();
  const seating = String(body.seating || "").trim();
  const requests = String(body.requests || "").trim().slice(0, 1000);

  if (name.length < 2 || name.length > 120) errors.push("name");
  if (!/^\+?[0-9 ().-]{8,20}$/.test(phone)) errors.push("phone");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) errors.push("email");
  if (!DATE_RE.test(date)) errors.push("date");
  if (!TIME_RE.test(time)) errors.push("time");
  if (!GUESTS_RE.test(guests)) errors.push("guests");
  if (!["terrace", "indoor", "private"].includes(seating)) errors.push("seating");

  return { errors, data: { name, phone, email, date, time, guests, seating, requests } };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};

  // Honeypot: real users never fill this field. Answer as if everything
  // worked so bots don't learn they were filtered.
  if (String(body.company || "").trim() !== "") {
    return res.status(200).json({ sent: true });
  }

  const { errors, data } = validate(body);
  if (errors.length > 0) {
    return res.status(400).json({ sent: false, errors });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESERVATION_EMAIL;
  if (!apiKey || !toEmail) {
    // Not configured yet — tell the front-end to use the WhatsApp fallback.
    return res.status(200).json({ sent: false, reason: "email_not_configured" });
  }

  const seatingLabels = { terrace: "Terrasse / Terrace", indoor: "Salle intérieure / Indoor", private: "Salle privée / Private room" };

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;border:1px solid #c9a961;padding:28px;background:#0c1220;color:#f3ecdc">
      <h1 style="color:#c9a961;letter-spacing:3px;text-align:center;font-weight:600">LE GATSBY</h1>
      <p style="text-align:center;color:#c9a961;margin-top:-8px">Nouvelle demande de réservation</p>
      <hr style="border:none;border-top:1px solid #c9a961" />
      <table style="width:100%;color:#f3ecdc;font-size:15px;line-height:2">
        <tr><td style="color:#c9a961">Nom</td><td>${esc(data.name)}</td></tr>
        <tr><td style="color:#c9a961">Téléphone</td><td>${esc(data.phone)}</td></tr>
        <tr><td style="color:#c9a961">Email</td><td>${esc(data.email)}</td></tr>
        <tr><td style="color:#c9a961">Date</td><td>${esc(data.date)}</td></tr>
        <tr><td style="color:#c9a961">Heure</td><td>${esc(data.time)}</td></tr>
        <tr><td style="color:#c9a961">Personnes</td><td>${esc(data.guests)}</td></tr>
        <tr><td style="color:#c9a961">Placement</td><td>${esc(seatingLabels[data.seating])}</td></tr>
        ${data.requests ? `<tr><td style="color:#c9a961;vertical-align:top">Demandes</td><td>${esc(data.requests)}</td></tr>` : ""}
      </table>
      <hr style="border:none;border-top:1px solid #c9a961" />
      <p style="font-size:12px;color:#9aa3b5;text-align:center">Confirmer par téléphone : ${esc(data.phone)}</p>
    </div>`;

  try {
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Le Gatsby <onboarding@resend.dev>",
        to: [toEmail],
        reply_to: data.email,
        subject: `Réservation — ${data.name} · ${data.date} ${data.time} · ${data.guests} pers.`,
        html
      })
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error("Resend error:", resendRes.status, detail);
      return res.status(200).json({ sent: false, reason: "email_failed" });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    console.error("Reservation email failed:", err);
    return res.status(200).json({ sent: false, reason: "email_failed" });
  }
};
