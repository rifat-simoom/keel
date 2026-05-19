FROM python:3.12-slim

WORKDIR /app

COPY backend/shared /app/shared_pkg
COPY backend/gateway /app/gateway

RUN pip install --no-cache-dir /app/shared_pkg && \
    pip install --no-cache-dir /app/gateway

EXPOSE 8000

CMD ["uvicorn", "gateway.main:app", "--host", "0.0.0.0", "--port", "8000"]
