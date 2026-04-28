import { verifySession } from "../lib/jwt.js";

function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
}

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
