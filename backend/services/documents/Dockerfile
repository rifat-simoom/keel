FROM python:3.12-slim

WORKDIR /app

COPY backend/shared ./shared
RUN pip install --no-cache-dir ./shared

COPY backend/services/__init__.py ./services/__init__.py
COPY backend/services/documents ./services/documents

RUN pip install --no-cache-dir -r ./services/documents/requirements.txt

ENV PYTHONPATH=/app

EXPOSE 8004

CMD ["uvicorn", "services.documents.main:app", "--host", "0.0.0.0", "--port", "8004"]
