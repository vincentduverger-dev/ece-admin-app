import path from "node:path";

import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../../../../.env"),
  quiet: true
});

export type NodeEnv = "development" | "test" | "production";

type OptionalStringOptions = {
  defaultValue?: string;
};

const readRawEnv = (name: string): string | undefined => {
  const value = process.env[name];

  if (value === undefined) {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
};

const readOptionalString = (name: string, options?: OptionalStringOptions): string | undefined => {
  const value = readRawEnv(name);

  if (value !== undefined) {
    return value;
  }

  return options?.defaultValue;
};

const readRequiredString = (name: string): string => {
  const value = readOptionalString(name);

  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const readNodeEnv = (): NodeEnv => {
  const value = readOptionalString("NODE_ENV", { defaultValue: "development" });

  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new Error(
    `Invalid environment variable NODE_ENV: expected one of development, test, production, received "${value}"`
  );
};

const parseIntegerEnv = (name: string, value: string): number => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `Invalid environment variable ${name}: expected a positive integer, received "${value}"`
    );
  }

  return parsedValue;
};

const readPort = (name: string, defaultValue: number): number => {
  const value = readOptionalString(name);

  if (value === undefined) {
    return defaultValue;
  }

  return parseIntegerEnv(name, value);
};

const readOptionalPort = (name: string): number | undefined => {
  const value = readOptionalString(name);

  if (value === undefined) {
    return undefined;
  }

  return parseIntegerEnv(name, value);
};

const readOptionalBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = readOptionalString(name);

  if (value === undefined) {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(
    `Invalid environment variable ${name}: expected true or false, received "${value}"`
  );
};

// Centralized backend environment access. Keep application code on `config`
// instead of reading `process.env` directly.
export const config = {
  app: {
    nodeEnv: readNodeEnv(),
    port: readPort("PORT", 3000)
  },
  database: {
    url: readRequiredString("DATABASE_URL")
  },
  email: {
    host: readOptionalString("SMTP_HOST"),
    port: readOptionalPort("SMTP_PORT"),
    secure: readOptionalBoolean("SMTP_SECURE", false),
    user: readOptionalString("SMTP_USER"),
    pass: readOptionalString("SMTP_PASS"),
    from: readOptionalString("SMTP_FROM")
  },
  admin: {
    email: readOptionalString("ADMIN_EMAIL"),
    password: readOptionalString("ADMIN_PASSWORD")
  }
} as const;
