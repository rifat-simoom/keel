FROM python:3.12-slim

WORKDIR /app

# Install shared package first (separate layer for caching)
COPY backend/shared ./shared
RUN pip install --no-cache-dir ./shared

# Create package structure mirroring dev layout
COPY backend/services/__init__.py ./services/__init__.py
COPY backend/services/auth ./services/auth

RUN pip install --no-cache-dir -r ./services/auth/requirements.txt

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "services.auth.main:app", "--host", "0.0.0.0", "--port", "8001"]
