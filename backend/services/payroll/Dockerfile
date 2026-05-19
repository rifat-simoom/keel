FROM python:3.12-slim

WORKDIR /app

COPY backend/shared /app/shared_pkg
COPY backend/services/payroll /app/service

RUN pip install --no-cache-dir /app/shared_pkg && \
    pip install --no-cache-dir /app/service

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
