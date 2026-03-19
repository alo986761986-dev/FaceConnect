#!/bin/bash
# Start script for Render deployment

# Export Python path
export PYTHONPATH="${PYTHONPATH}:/opt/render/project/src/backend"

# Start the server
exec uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}
