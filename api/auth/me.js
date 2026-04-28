import { verifySession } from "../lib/jwt.js";
import { parseCookies } from "../lib/cookies.js";

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies["ftp_session"];
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    const payload = await verifySession(token);
    return res.status(200).json({
      authenticated: true,
      username: payload.username,
      expiresAt: payload.exp,
    });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
}
