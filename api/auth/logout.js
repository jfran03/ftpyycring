export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const secure = req.headers["x-forwarded-proto"] === "https";
  const cookie = [
    "ftp_session=",
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ ok: true });
}
