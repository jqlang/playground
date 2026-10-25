import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",

  // v11 defaults (equivalent to v10's sendDefaultPii: true), except URL query strings: GET /api/jq carries the
  // user's JSON and query in them. https://docs.sentry.io/platforms/javascript/configuration/options/#dataCollection
  dataCollection: {
    urlQueryParams: false,
  },

  // Next.js's own request spans set these attributes directly, bypassing dataCollection.
  beforeSendSpan: (span) => {
    for (const key of ["http.target", "url.full"]) {
      const value = span.attributes[key];
      if (typeof value === "string") span.attributes[key] = value.split("?")[0];
    }
    delete span.attributes["url.query"];
    return span;
  },

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.05,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',

});

export const onRequestError = Sentry.captureRequestError;
