"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Box, Container, Grid, Link, Paper, Typography } from "@mui/material";
import Header from "./Header";
import JSONEditor from "./JSONEditor";
import QueryEditor from "./QueryEditor";
import OptionsSelector from "./OptionsSelector";
import OutputEditor from "./OutputEditor";
import { ThemeProvider } from "./ThemeProvider";
import { Notification, NotificationProps } from "./Notification";
import {
  currentUnixTimestamp,
  generateMessageId,
  normalizeLineBreaks,
  prettifyZodError,
} from "@/lib/utils";
import { JQWorker } from "@/workers";
import { useRouter } from "next/navigation";
import {
  HttpMethodType,
  HttpType,
  Snippet,
  SnippetType,
  OptionsType,
  Options,
} from "@/workers/model";
import { ZodError } from "zod";
import { CreateSnippetResponse } from "@/app/api/snippets/route";

const runTimeout = 30000;

class RunError extends Error {
  runId: number;
  constructor(runID: number, message: string) {
    super(message);
    this.runId = runID;
  }
}

class RunResult {
  runId: number;
  result: string;
  constructor(runID: number, result: string) {
    this.runId = runID;
    this.result = result;
  }
}

export interface PlaygroundProps {
  input?: SnippetType;
  initialNotification?: NotificationProps;
}

export function Playground({ input, initialNotification }: PlaygroundProps) {
  return (
    <ThemeProvider>
      <PlaygroundElement
        input={input}
        initialNotification={initialNotification}
      />
    </ThemeProvider>
  );
}

function PlaygroundElement({ input, initialNotification }: PlaygroundProps) {
  const router = useRouter();
  const [result, setResult] = useState<string>("");

  const [http, setHttp] = useState<HttpType | undefined>(
    input?.http ?? undefined
  );
  const [json, setJson] = useState<string | undefined>(
    input?.json ?? undefined
  );
  const [query, setQuery] = useState<string>(input?.query || "");
  const [options, setOptions] = useState<OptionsType>(input?.options || []);

  const [minEditorHeight, setMinEditorHeight] = useState<number>(0);
  const [minQueryEditorHeight, setQueryMinEditorHeight] = useState<number>(0);
  const [notification, setNotification] = useState<
    NotificationProps | undefined
  >(initialNotification);

  const workerRef = useRef<JQWorker | null>(null);
  const runIdRef = useRef<number | null>(null);
  const runTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const clearRunTimeout = useCallback(() => {
    if (runTimeoutRef.current) {
      clearTimeout(runTimeoutRef.current);
      runTimeoutRef.current = null;
    }
    runIdRef.current = null;
  }, []);

  const updateMinHeight = useCallback(() => {
    const height = window.innerHeight - 64 - 110;
    const editorHeight = (height * 2) / 3;
    const queryEditorHeight = height / 3;
    const minHeight = 130;
    setMinEditorHeight(Math.max(editorHeight, minHeight));
    setQueryMinEditorHeight(Math.max(queryEditorHeight, minHeight));
  }, []);

  useEffect(() => {
    updateMinHeight();
    window.addEventListener("resize", updateMinHeight);
    return () => {
      window.removeEventListener("resize", updateMinHeight);
      clearRunTimeout();
      terminateWorker();
    };
  }, [updateMinHeight, clearRunTimeout, terminateWorker]);

  const runJQ = useCallback(
    (
      runId: number,
      json: string | undefined,
      http: HttpType | undefined,
      query: string,
      options: string[],
      timeout: number
    ): Promise<RunResult> => {
      terminateWorker();
      return new Promise<RunResult>((resolve, reject) => {
        try {
          const worker = new JQWorker(timeout);
          workerRef.current = worker;

          const input = Snippet.parse({
            json: normalizeLineBreaks(json),
            http: http,
            query: normalizeLineBreaks(query),
            options: options,
          });
          worker
            .run(input)
            .then((result) => resolve(new RunResult(runId, result)))
            .catch((error) => reject(new RunError(runId, error.message)));
        } catch (error: any) {
          if (error instanceof ZodError) {
            const errorMessage = prettifyZodError(error);
            reject(new RunError(runId, errorMessage));
          }
          reject(new RunError(runId, error.message));
        }
      });
    },
    [terminateWorker]
  );

  const handleJQRun = useCallback(
    (
      json: string | undefined,
      http: HttpType | undefined,
      query: string,
      options: string[]
    ) => {
      clearRunTimeout();
      setResult("");

      if ((!json && !http) || query === "") return;

      setResult("Running...");
      const runId = currentUnixTimestamp();
      runIdRef.current = runId;

      runTimeoutRef.current = setTimeout(() => {
        runJQ(runId, json, http, query, options, runTimeout)
          .then((result) => {
            if (runIdRef.current === result.runId) {
              setResult(result.result);
            }
          })
          .catch((error) => {
            if (runIdRef.current === error.runId) {
              setResult(`Error: ${error.message}`);
            }
          });
      }, 500);
    },
    [clearRunTimeout, runJQ]
  );

  useEffect(() => {
    handleJQRun(json, http, query, options);
  }, [json, http, query, options, handleJQRun]);

  const handleJSONEditorChange = useCallback(
    (value: string | undefined) => {
      setJson(value);
      setHttp(undefined);
    },
    [setJson, setHttp]
  );

  const handleQueryEditorChange = useCallback(
    (value: string | undefined) => {
      if (value) setQuery(value);
    },
    [setQuery]
  );

  const handleOptionsSelectorChange = useCallback(
    (options: string[]) => {
      const opts = Options.parse(options);
      setOptions(opts);
    },
    [setOptions]
  );

  const handleHttp = useCallback(
    (method: HttpMethodType, url?: string, headers?: string, body?: string) => {
      if (url === undefined) {
        return;
      }

      const http: HttpType = {
        method,
        url: url || "",
        headers,
        body,
      };

      setHttp(http);
      setJson(undefined);
    },
    [setHttp, setJson]
  );

  const handleShare = useCallback(async () => {
    if ((!json && !http) || !query) {
      setNotification({
        message: "Please provide a Query and either JSON or HTTP data.",
        messageId: generateMessageId(),
        severity: "error",
      });
      return;
    }

    try {
      const body: SnippetType = { json, http, query, options };
      const response = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data: CreateSnippetResponse = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors || response.statusText;
        throw new Error(errorMessage);
      }

      if (data.slug) {
        router.push(`/s/${data.slug}`);
      } else {
        throw new Error("Unexpected response: Missing slug");
      }
    } catch (error: any) {
      setNotification({
        message: error.message || "An unexpected error occurred.",
        messageId: generateMessageId(),
        severity: "error",
      });
    }
  }, [json, http, query, options, router]);

  const onExampleClick = useCallback(
    (json: string, query: string) => {
      setJson(json);
      setQuery(query);
      setHttp(undefined);
    },
    [setJson, setQuery, setHttp]
  );

  const onCopyClick = useCallback(() => {
    navigator.clipboard
      .writeText(`jq ${options.join(" ")} '${query}'`)
      .then(() =>
        setNotification({
          message: "Copied command",
          messageId: generateMessageId(),
          severity: "success",
        })
      )
      .catch((error) =>
        setNotification({
          message: error.message,
          messageId: generateMessageId(),
          severity: "error",
        })
      );
  }, [query, options]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        color: "text.primary",
      }}
    >
      <Header
        onShare={handleShare}
        onExampleClick={onExampleClick}
        onCopyClick={onCopyClick}
        enableCopyButton={!!query.length}
      />
      <Container
        sx={{
          flexGrow: 1,
          py: 2,
          display: "flex",
          flexDirection: "column",
          minWidth: "100%",
        }}
      >
        <Grid
          container
          spacing={2}
          sx={{
            flexGrow: 1,
            minWidth: "100%",
          }}
        >
          <Grid
            item
            xs={12}
            md={6}
            sx={{ display: "flex", flexDirection: "column" }}
          >
            <Grid container spacing={1} sx={{ flexGrow: 1 }}>
              <Grid
                item
                xs={12}
                md={12}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: minQueryEditorHeight,
                }}
              >
                <QueryEditor
                  value={query}
                  handleChange={handleQueryEditorChange}
                />
              </Grid>
            </Grid>
            <Box>
              <OptionsSelector
                options={options}
                setOptions={handleOptionsSelectorChange}
              />
            </Box>
            <Grid container spacing={1} sx={{ flexGrow: 1 }}>
              <Grid
                item
                xs={12}
                md={12}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: minEditorHeight,
                }}
              >
                <JSONEditor
                  json={json}
                  http={http}
                  handleJSONChange={handleJSONEditorChange}
                  handleHTTPChange={handleHttp}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid
            item
            xs={12}
            md={6}
            sx={{ display: "flex", flexDirection: "column" }}
          >
            <Grid container sx={{ flexGrow: 1 }}>
              <Grid
                item
                xs={12}
                md={12}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: minEditorHeight,
                }}
              >
                <OutputEditor result={result} />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body1" sx={{ color: "text.secondary" }}>
            jq playground is open-source and licensed under the MIT license.
            <br />
            All jq queries and HTTP requests to fetch JSON are processed locally
            in your browser.
            <br />
            Snippets are only sent to the server when you choose to share them.
            <br />
            View the&nbsp;
            <Link
              href="https://github.com/jqlang/playground"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              source code
            </Link>
            &nbsp;on GitHub.
          </Typography>
        </Box>
        <Notification
          message={notification?.message}
          messageId={notification?.messageId}
          severity={notification?.severity}
        />
      </Container>
    </Box>
  );
}
