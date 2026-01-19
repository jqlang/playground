"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import { useEffect, useState } from "react";

import "@scalar/api-reference-react/style.css";

export default function ApiDocsPage() {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(`${window.location.origin}/api`);
  }, []);

  // Don't render until we have the correct origin
  if (!baseUrl) {
    return null;
  }

  return (
    <ApiReferenceReact
      key={baseUrl}
      configuration={{
        _integration: "nextjs",
        url: "/openapi.json",
        servers: [
          {
            url: baseUrl,
            description: "Current server",
          },
        ],
      }}
    />
  );
}