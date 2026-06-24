import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // Include packages that are dynamically loaded by piscina workers
    serverExternalPackages: ['jq-wasm', 'piscina'],
    outputFileTracingIncludes: {
        '/app/api/jq/route': ['./src/workers/server/worker.cjs', './node_modules/jq-wasm/**/*'],
    },
    webpack: (config, { isServer, webpack }) => {
        config.resolve.fallback = {
            fs: false,
            path: false,
            crypto: false
        };
        // jq-wasm 1.2 imports Node built-ins via the `node:` scheme; rewrite them
        // to bare specifiers so the browser build uses the fallbacks above instead
        // of failing on the unhandled `node:` scheme.
        config.plugins.push(
            new webpack.NormalModuleReplacementPlugin(/^node:(fs|path|crypto)$/, (resource) => {
                resource.request = resource.request.replace(/^node:/, '');
            })
        );
        // Don't bundle piscina - it needs to load workers at runtime
        if (isServer) {
            config.externals = config.externals || [];
            config.externals.push('piscina');
        }
        return config;
    },
};

export default withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: "jqplay-org",
    project: "jqplay-org",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Bundler-specific options were moved under `webpack` in @sentry/nextjs v10
    webpack: {
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        treeshake: {
            removeDebugLogging: true,
        },

        // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
        // See the following for more information:
        // https://docs.sentry.io/product/crons/
        // https://vercel.com/docs/cron-jobs
        automaticVercelMonitors: true,
    },
});
