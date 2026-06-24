# syntax = docker/dockerfile:1

# NODE_VERSION is read from .node-version and passed via --build-arg
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js/Prisma"

# Next.js/Prisma app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

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

# Stage a self-contained Prisma CLI with its FULL production dependency closure
# for the release_command. Prisma 7's @prisma/config pulls in hoisted deps
# (effect, c12, deepmerge-ts, empathic, ...) that a cherry-pick of node_modules/
# prisma + @prisma misses, which breaks `prisma migrate deploy` with
# "Cannot find module 'effect'". A dedicated install resolves the complete tree;
# pin to the already-installed version to avoid prisma/@prisma/client drift.
RUN mkdir -p /prisma-cli && cd /prisma-cli \
    && npm init -y > /dev/null 2>&1 \
    && npm install --omit=dev --no-audit --no-fund "prisma@$(node -p "require('/app/node_modules/prisma/package.json').version")"

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Merge the complete Prisma CLI closure into the app's node_modules so the
# release_command (`prisma migrate deploy`) can resolve prisma/config and its
# transitive deps. Copied before the standalone output below, so the app's traced
# node_modules layers on top (its @prisma/client / adapter-pg win on overlap).
COPY --from=build /prisma-cli/node_modules /app/node_modules

# Copy built application
COPY --from=build /app/.next/standalone /app
COPY --from=build /app/.next/static /app/.next/static
COPY --from=build /app/public /app/public
COPY --from=build /app/prisma /app/prisma
# Prisma 7 reads the migrate connection URL from prisma.config.ts (release_command runs `prisma migrate deploy`)
COPY --from=build /app/prisma.config.ts /app/prisma.config.ts

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "node", "server.js" ]
