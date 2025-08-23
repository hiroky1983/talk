# Python AI Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install minimal system dependencies
RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the FastAPI port
EXPOSE 8001

# Start the FastAPI server
CMD ["python", "fastapi_server.py"]