import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { db } from "../db";
import { env } from "../config/env";
import { sendTwoFactorOtpEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // can enable later
  },
  trustedOrigins: [
    env.CORS_ORIGIN,
  ],

  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60, // refresh every hour
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache
    },
  },

  user: {
    additionalFields: {
      publicKey: { type: "string", required: false, input: true },
      encryptedPrivateKey: { type: "string", required: false, input: true },
      keyDerivationSalt: { type: "string", required: false, input: true },
    },
  },

  advanced: {
    cookiePrefix: "docloc",
    useSecureCookies: env.APP_URL.startsWith('https://'),
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: env.APP_URL.startsWith('https://'),
    },
  },

  plugins: [
    twoFactor({
      issuer: "DocLocker",
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendTwoFactorOtpEmail(user.email, otp);
        },
      },
    }),
  ],
});
