FROM python:3.12-slim

WORKDIR /app

COPY backend/shared ./shared
RUN pip install --no-cache-dir ./shared

COPY backend/services/__init__.py ./services/__init__.py
COPY backend/services/tax ./services/tax

RUN pip install --no-cache-dir -r ./services/tax/requirements.txt

ENV PYTHONPATH=/app

EXPOSE 8005

CMD ["uvicorn", "services.tax.main:app", "--host", "0.0.0.0", "--port", "8005"]
