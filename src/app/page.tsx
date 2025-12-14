import { Playground } from '@/components/Playground';
import { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { NotificationProps } from '@/components/Notification';
import { generateMessageId, prettifyZodError } from '@/lib/utils';
import { Snippet, SnippetType } from '@/workers/model';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps): Promise<JSX.Element> {
    let snippet: SnippetType | undefined;
    let notification: NotificationProps | undefined;

    const params = await searchParams;

    try {
        const j = (typeof params.j === 'string') ? params.j : undefined;
        const q = (typeof params.q === 'string') ? params.q : undefined;
        let o: string[] | string | undefined;
        if (params.o) {
            const rawOptions = Array.isArray(params.o) ? params.o : [params.o];
            o = rawOptions.map(val => val);
        }

        if (j || q) {
            snippet = Snippet.parse({ json: j, query: q, options: o });
        }
    } catch (error: any) {
        let message = error.message;
        if (error instanceof ZodError) {
            message = prettifyZodError(error);
        }

        notification = {
            message,
            messageId: generateMessageId(),
            severity: 'error',
        };

        console.error(`Failed to parse snippet: ${error.message}`);
        Sentry.captureException(error, { extra: { params } });
    }

    return (
        <Suspense
            fallback={
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                    }}
                >
                    <CircularProgress />
                </Box>
            }
        >
            <Playground input={snippet} initialNotification={notification} />
        </Suspense>
    );
}
