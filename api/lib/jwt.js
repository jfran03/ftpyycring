import { SignJWT, jwtVerify } from "jose";

const SESSION_TTL = "15m";

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return new TextEncoder().encode(process.env.JWT_SECRET);
};

export async function signSession({ sub, username }) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(getSecret());
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}
