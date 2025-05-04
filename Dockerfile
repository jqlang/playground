# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22

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
RUN npm ci --include=dev

# Copy application code
COPY --link . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install Prisma CLI globally
RUN npm install -g prisma

# Copy built application
COPY --from=build /app/.next/standalone /app
COPY --from=build /app/.next/static /app/.next/static
COPY --from=build /app/public /app/public
COPY --from=build /app/prisma /app/prisma

# Start the server by default, this can be overwritten at runtime
EXPOSE 3000
CMD [ "node", "server.js" ]
