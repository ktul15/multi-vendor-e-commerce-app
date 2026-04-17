#!/bin/sh
set -e

# Apply any pending migrations non-interactively before starting the server.
# Use `migrate deploy` (not `migrate dev`) — it never creates new migration files.
npx prisma migrate deploy

# Replace this shell process with node so that SIGTERM is forwarded correctly
# to the application (important for graceful shutdown in container orchestrators).
exec node dist/server.js
