# syntax = docker/dockerfile:1

# NODE_VERSION is read from .node-version and passed via --build-arg
ARG NODE_VERSION=25

FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js/Prisma"

# Next.js/Prisma app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base as build

ARG NEXT_PUBLIC_SENTRY_DSN=
ARG SENTRY_AUTH_TOKEN=
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3 ca-certificates

# Install node modules
COPY --link package-lock.json package.json ./
COPY --link prisma .
COPY --link scripts scripts
RUN npm ci --include=dev

# Copy application code
COPY --link . .

# Build application (increase heap size for large dependencies like @scalar/api-reference)
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Save prisma CLI and its dependencies before pruning dev dependencies
RUN mkdir -p /prisma-cli && cp -r node_modules/prisma node_modules/@prisma node_modules/effect /prisma-cli/

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy prisma CLI and dependencies from build stage (uses version from package.json)
COPY --from=build /prisma-cli/prisma /app/node_modules/prisma
COPY --from=build /prisma-cli/@prisma /app/node_modules/@prisma
COPY --from=build /prisma-cli/effect /app/node_modules/effect

# Copy built application
COPY --from=build /app/.next/standalone /app
COPY --from=build /app/.next/static /app/.next/static
COPY --from=build /app/public /app/public
COPY --from=build /app/prisma /app/prisma

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "node", "server.js" ]
