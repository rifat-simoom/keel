FROM python:3.12-slim

WORKDIR /app

COPY backend/shared ./shared
RUN pip install --no-cache-dir ./shared

COPY backend/services/__init__.py ./services/__init__.py
COPY backend/services/notifications ./services/notifications

RUN pip install --no-cache-dir -r ./services/notifications/requirements.txt

ENV PYTHONPATH=/app

EXPOSE 8006

CMD ["uvicorn", "services.notifications.main:app", "--host", "0.0.0.0", "--port", "8006"]
