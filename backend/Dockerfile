FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install deps
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project
COPY . .

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh || true

EXPOSE 8000

# Entrypoint handles migrate/collectstatic and starts gunicorn
CMD ["./entrypoint.sh"]
