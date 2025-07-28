"use client";

import NextErrorComponent from "next/error";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { message?: string }; // Ensure error has a message property
}

const GlobalError: React.FC<GlobalErrorProps> = ({ error }) => {
  return (
    <html>
      <body>
        <NextErrorComponent
          statusCode={500}
          title={error.message || "An unexpected error occurred"}
        />
      </body>
    </html>
  );
};

export default GlobalError;
