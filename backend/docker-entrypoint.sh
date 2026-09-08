#!/bin/sh
set -e

# Production schema changes run through the separately authorized migration job.
# Application replicas must never coordinate migrations during startup.

# Replace this shell process with node so that SIGTERM is forwarded correctly
# to the application (important for graceful shutdown in container orchestrators).
exec node dist/server.js
