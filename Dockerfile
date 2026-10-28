FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    GARDEN_DATA_DIR=/var/data \
    GARDEN_COOKIE_SECURE=1

WORKDIR /app

COPY requirements.txt requirements-deploy.txt ./
RUN python -m pip install --no-cache-dir -r requirements-deploy.txt

COPY server ./server
COPY www ./www

RUN mkdir -p /var/data

EXPOSE 8000

# SQLite 用单 worker + 多线程即可，避免多进程写锁竞争。
CMD ["sh", "-c", "gunicorn --workers 1 --threads 4 --timeout 120 --access-logfile - --error-logfile - --bind 0.0.0.0:${PORT:-8000} 'server.app:create_app()'"]
