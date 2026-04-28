import { exchangeCode, fetchUser, fetchUserGuilds, isInGuild } from "../../lib/discord.js";
import { signSession } from "../../lib/jwt.js";
import { parseCookies } from "../../lib/cookies.js";

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = parseCookies(req.headers.cookie);
  const stateCookie = cookies["ftp_oauth_state"];
  const secure = req.headers["x-forwarded-proto"] === "https";

  const clearState = [
    "ftp_oauth_state=",
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");

  res.setHeader("Set-Cookie", clearState);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return res.redirect(302, "/join?status=error");
  }

  try {
    const { access_token } = await exchangeCode(code);
    const [user, guilds] = await Promise.all([
      fetchUser(access_token),
      fetchUserGuilds(access_token),
    ]);

    if (!isInGuild(guilds, process.env.DISCORD_GUILD_ID)) {
      return res.redirect(302, "/join?status=not-member");
    }

    const jwt = await signSession({ sub: user.id, username: user.username });
    const sessionCookie = [
      `ftp_session=${jwt}`,
      "HttpOnly",
      secure ? "Secure" : "",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=900",
    ]
      .filter(Boolean)
      .join("; ");

    res.setHeader("Set-Cookie", sessionCookie);
    return res.redirect(302, "/join?status=ok");
  } catch {
    return res.redirect(302, "/join?status=error");
  }
}
