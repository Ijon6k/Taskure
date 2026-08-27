#!/bin/sh
# AI service entrypoint: runs the outbox worker in the background and the
# FastAPI server in the foreground. The worker consumes outbox events via the
# Go backend (it never touches the database directly).
set -e

# Start the worker process in the background (it owns its own asyncio loop).
echo "[entrypoint] starting outbox worker"
python -m services.ai.workers &
WORKER_PID=$!

# Forward SIGTERM/SIGINT to the worker so a container stop drains cleanly.
trap 'kill -TERM $WORKER_PID 2>/dev/null || true' TERM INT

echo "[entrypoint] starting uvicorn"
uvicorn services.ai.main:app --host 0.0.0.0 --port 5000 --workers 2 --limit-max-requests 1000

# If uvicorn exits, take the worker down with it.
kill -TERM $WORKER_PID 2>/dev/null || true
wait $WORKER_PID 2>/dev/null || true
