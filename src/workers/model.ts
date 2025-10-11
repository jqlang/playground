import { z } from "zod";

// Schema for HTTP methods
export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
]);

// Schema for HTTP headers as a JSON string
export const HttpHeadersSchema = z.string().refine(
  (value) => {
    // Allow empty or undefined strings, else validate as JSON
    if (!value) return true;
    try {
      const parsed = JSON.parse(value);
      // Ensure the parsed object is a plain object with string keys and string values
      return (
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        Object.entries(parsed).every(
          ([key, val]) => typeof key === "string" && typeof val === "string"
        )
      );
    } catch {
      return false; // Return false if JSON parsing fails
    }
  },
  {
    message:
      "HTTP headers must be a valid JSON string representing key-value pairs.",
    path: ["http", "headers"], // Specific path for error reporting
  }
);

// Schema for HTTP URL
export const HttpUrlSchema = z.string().url();

// Full HTTP request schema
export const HttpRequestSchema = z.object({
  method: HttpMethodSchema,
  url: HttpUrlSchema,
  headers: HttpHeadersSchema.optional(),
  body: z.string().optional(),
});

export const Option = z.enum(["-c", "-n", "-R", "-r", "-s", "-S"]);
export const Options = z.array(Option);

// Main input schema
export const Snippet = z
  .object({
    json: z.string().optional().nullable(),
    http: HttpRequestSchema.optional().nullable(),
    query: z.string().min(1),
    options: Options.optional().nullable(),
  })
  .refine((data) => (data.json ? !data.http : !!data.http), {
    message: "Either JSON or HTTP must be provided.",
    path: ["json", "http"],
  });

// TypeScript types for better type inference
export type HttpMethodType = z.infer<typeof HttpMethodSchema>;
export type HttpType = z.infer<typeof HttpRequestSchema>;
export type SnippetType = z.infer<typeof Snippet>;
export type OptionsType = z.infer<typeof Options>;
