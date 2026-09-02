# ---- Dockerfile: containerizes the Carpool Coordination Platform ----
FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Flask app listens on port 5000
EXPOSE 5000

# Initialize DB and start the server
CMD ["python", "app.py"]
