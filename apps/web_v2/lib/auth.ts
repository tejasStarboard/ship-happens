import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { sqlite } from "@/lib/db";

export const auth = betterAuth({
  database: sqlite,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
