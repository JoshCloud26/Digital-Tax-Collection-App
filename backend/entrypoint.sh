#!/bin/sh
set -e

# Default PORT if not provided by host
: "${PORT:=8000}"

# Run migrations (best-effort) and collect static files
python manage.py migrate --noinput || true
python manage.py collectstatic --noinput || true

# Start gunicorn
exec gunicorn pit_system.wsgi:application --bind 0.0.0.0:${PORT} --workers 3
