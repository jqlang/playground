import { NextResponse } from "next/server";
import { GetSnippet, validSlug } from "@/lib/database";
import { Snippet, SnippetType } from "@/workers/model";
import z, { ZodError } from "zod";

interface PageProps {
  params: Promise<{ slug: string }>;
}

type GetSnippetResponse =
  | SnippetType
  | {
      errors?: string;
    };

export async function GET(
  _: Request,
  { params }: PageProps
): Promise<NextResponse<GetSnippetResponse>> {
  const slug = (await params).slug;
  if (!slug) {
    return NextResponse.json({ errors: "No slug provided" }, { status: 404 });
  }

  if (!validSlug.test(slug)) {
    return NextResponse.json(
      { errors: "Invalid slug provided" },
      { status: 404 }
    );
  }

  try {
    const snippet = await GetSnippet(slug);
    if (!snippet) {
      return NextResponse.json(
        { errors: "Snippet not found" },
        { status: 404 }
      );
    }

    const resp = Snippet.parse(snippet);
    return NextResponse.json(resp);
  } catch (error: any) {
    console.error(`Failed to load snippet: ${error.message}`, error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { errors: z.prettifyError(error) },
        { status: 422 }
      );
    }
    return NextResponse.json({ errors: "Server error" }, { status: 500 });
  }
}
