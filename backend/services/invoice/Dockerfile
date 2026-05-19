FROM python:3.12-slim

WORKDIR /app

COPY backend/shared ./shared
RUN pip install --no-cache-dir ./shared

COPY backend/services/__init__.py ./services/__init__.py
COPY backend/services/invoice ./services/invoice

RUN pip install --no-cache-dir -r ./services/invoice/requirements.txt

ENV PYTHONPATH=/app

EXPOSE 8003

CMD ["uvicorn", "services.invoice.main:app", "--host", "0.0.0.0", "--port", "8003"]
