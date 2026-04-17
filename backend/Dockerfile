# ============================================================
# Stage 1: builder — compile TypeScript and generate Prisma client
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests and Prisma schema first to leverage layer caching.
# If only src/ changes, the npm ci layer is not invalidated.
COPY package*.json ./
COPY prisma/ ./prisma/

RUN npm ci

# Copy remaining build inputs
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY src/ ./src/

# Generate Prisma client into src/generated/prisma/ BEFORE tsc runs.
# This directory is gitignored; TypeScript will fail to compile without it.
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# Compile prisma.config.ts to CJS so the production stage can run it without
# a TypeScript runtime (ts-node/tsx are devDependencies, absent in production).
RUN npx tsc prisma.config.ts --module commonjs --esModuleInterop --skipLibCheck --target ES2022 --outDir .

# ============================================================
# Stage 2: production — lean runtime image
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

COPY package*.json ./

# Install production dependencies only.
# `prisma` is in dependencies so the CLI is available for migrate deploy.
RUN npm ci --omit=dev

# Copy compiled output and Prisma artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.js ./prisma.config.js

# Copy the generated Prisma client (query engine binary + JS modules).
# Lives in src/generated/prisma/ per schema output path — must exist at runtime.
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Copy and permission the entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Run as non-root for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]
