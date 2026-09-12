# ============================================================
# Stage 1: builder — compile TypeScript and generate Prisma client
# ============================================================
FROM node:24.15.0-alpine AS builder

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

# ============================================================
# Optional migration job — one-shot tooling, never the app entrypoint
# ============================================================
FROM builder AS migration

ENTRYPOINT ["npm", "run", "migrations:deploy"]

# ============================================================
# Stage 2: production — lean runtime image
# ============================================================
FROM node:24.15.0-alpine AS production

WORKDIR /app

COPY package*.json ./

# Install production dependencies only. Schema deployment is performed by the
# separately authorized migration job, not by application containers.
RUN npm ci --omit=dev --omit=optional

# Copy compiled output and Prisma artifacts from builder
COPY --from=builder /app/dist ./dist
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

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
