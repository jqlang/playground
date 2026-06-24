# playground

A [jq](https://jqlang.github.io/jq) playground built with [Next.js](https://nextjs.org).
Test your jq queries against JSON directly in your browser. All jq queries and HTTP requests to fetch JSON are processed **locally** in your browser. Snippets are sent to the server **only** if you choose to share them.

✨ **Try it out at [play.jqlang.org](https://play.jqlang.org)!**

## How It Works

- **WebAssembly-Powered**: it integrates the [jq-wasm](https://github.com/owenthereal/jq-wasm) package, a WebAssembly-based jq JSON processor for Node.js and browsers, with no native dependencies. This ensures that all jq queries run directly in your browser.
- **Local Data Processing**: Your JSON input is processed locally in your browser, ensuring your data stays private and secure.
- **Shareable Snippets**: If you share your jq query, a unique URL is generated on the server. Others can open the shared snippet, but the query will still run locally in their browser.

## Getting Started

Prerequisites

- Node.js (>= 14.x recommended)
- npm or yarn package manager
- PostgreSQL (for storing shared snippets)

## Running the App

### 1. Clone the repository

```console
git clone https://github.com/jqlang/playground
cd playground
```

### 2. Start in Development Mode

To start the app in development mode with hot reload enabled and a local PostgreSQL database:

```console
docker compose up
```

Open your browser to <http://localhost:3000> to explore the playground.

### 3. Run a Production Build

For a production-ready build, use:

```console
npm run build
npm run start
```

Open your browser to <http://localhost:3000> to use playground locally in production mode.

## Configuration

The only variable required at runtime is `DATABASE_URL` (PostgreSQL, for shared snippets). Everything else runs on sensible defaults.

The public jq API (`POST`/`GET /api/jq`) executes queries in a server-side worker pool. Because jq runs in WebAssembly, the pool is **memory-bound**, so its size defaults to a value **derived from the machine's available RAM** (e.g. 2 workers on a 512 MB instance). You normally don't need to touch this, but you can override it on larger or smaller instances:

| Variable | Default | Description |
|----------|---------|-------------|
| `JQ_POOL_MAX_THREADS` | auto from RAM (2 on ~512 MB) | Max concurrent jq worker threads. |
| `JQ_POOL_MAX_QUEUE` | `JQ_POOL_MAX_THREADS` × 20 (40 on ~512 MB) | Max requests queued for a free worker; the API returns `429` past this. |

These affect only server-side `/api/jq` execution — in-browser query execution is unaffected.

## Contributing

Contributions are welcome! 🎉 Whether you’re fixing bugs, adding features, or improving documentation, your help is appreciated.

## License

📜 The jq playground is licensed under the [MIT License](LICENSE).

---

Happy querying! 🚀
