import { withSentryConfig } from '@sentry/nextjs';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import withSerwistInit from "@serwist/next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withSerwist = withSerwistInit({
    swSrc: "src/app/sw.ts",
    swDest: "public/sw.js",
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // bump to 5MB to include the jq-wasm files
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    webpack: (config, { isServer }) => {
        config.resolve.fallback = {
            fs: false,
            path: false,
            crypto: false
        };

        if (!isServer) {
            config.plugins.push(
                new MonacoWebpackPlugin({
                    languages: ['json', 'plaintext'],
                    filename: 'static/[name].worker.js', // Make sure this matches the output path in Next.js
                })
            );
        }

        return config;
    },
};

export default withSerwist(withSentryConfig(nextConfig, {
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

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
}));

initOpenNextCloudflareForDev();
