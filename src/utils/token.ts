import jwt, { decode } from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY || "";
const SECRET_REFRESH_KEY = process.env.SECRET_REFRESH_KEY || "";
const EXPIRATION = parseInt(process.env.JWT_EXPIRES_IN || "3600");

export const generateTokens = (userId: string) => ({
  accessToken: jwt.sign({ userId }, SECRET_KEY, { expiresIn: EXPIRATION }),
  refreshToken: jwt.sign({ userId }, SECRET_REFRESH_KEY, {
    expiresIn: EXPIRATION * 24 * 7,
  }),
});

export const decodeToken = (token: string, isRefreshToken = false) =>
  jwt.verify(token, isRefreshToken ? SECRET_REFRESH_KEY : SECRET_KEY) as {
    userId: string;
  };

export const getAuthCookiesOptions = (token: string) => {
  const decoded: any = decode(token);

  if (!decoded) {
    throw new Error("Invalid token");
  }

  const expiryDate = new Date(decoded.exp * 1000);

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiryDate,
  }
};
