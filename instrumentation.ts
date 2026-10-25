import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // Request headers, IP and bodies are collected by default in v11 (equivalent to v10's sendDefaultPii: true), see:
  // https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.05,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',

});

export const onRequestError = Sentry.captureRequestError;
