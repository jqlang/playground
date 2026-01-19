import { Playground } from '@/components/Playground';
import { redirect } from 'next/navigation';
import { Snippet } from '@/schemas';
import { GetSnippet } from '@/lib/prisma';
import * as Sentry from '@sentry/node';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps): Promise<JSX.Element> {
    const slug = (await params).slug;
    if (!slug) {
        return redirect('/');
    }

    const snippet = await GetSnippet(slug);
    if (!snippet) {
        redirect('/');
    }

    try {
        const input = Snippet.parse(snippet);
        return (
            <Playground
                input={input}
            />
        );
    } catch (error: any) {
        console.error(`Failed to load snippet: ${error.message}`);
        Sentry.captureException(error, { extra: { slug } });

        redirect('/');
    }
}
