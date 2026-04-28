import { buildAuthorizeUrl } from "../../lib/discord.js";

export default function handler(req, res) {
  const state = crypto.randomUUID();
  const secure = req.headers["x-forwarded-proto"] === "https";
  const cookieFlags = [
    `ftp_oauth_state=${state}`,
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=600",
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", cookieFlags);
  res.setHeader("Location", buildAuthorizeUrl(state));
  res.status(302).end();
}
