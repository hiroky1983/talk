# Gemini Code Assistant Context

## Project Overview

This is a monorepo for a web application with a Go backend and a Next.js frontend. The backend and frontend communicate using gRPC. A Python service for AI-related tasks is also included. The project is containerized using Docker.

### Key Technologies

*   **Backend:** Go, Gin, gRPC (Connect)
*   **Frontend:** Next.js, React, TypeScript, Tailwind CSS
*   **API:** Protocol Buffers (Buf)
*   **AI Service:** Python
*   **Containerization:** Docker

### Architecture

The application is composed of three main services:

1.  **Go Backend (`app`):** Exposes a gRPC API and handles the core business logic. It communicates with the Python AI service.
2.  **Next.js Frontend:** A modern web interface built with React and Next.js. It interacts with the Go backend using gRPC-web.
3.  **Python AI Service (`ai-service`):** Provides AI-powered features to the Go backend.

## Building and Running

The project is designed to be run with Docker Compose.

### Docker

To build and run all the services:

```bash
docker-compose up --build
```

The services will be available at the following ports:

*   **Go Backend:** `http://localhost:8000`
*   **Python AI Service:** `http://localhost:50051`

### Frontend (Next.js)

To run the frontend development server:

```bash
cd next
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Backend (Go)

The Go backend is automatically rebuilt and restarted on file changes when running with `docker-compose up`.

### Protocol Buffers

To regenerate the Go and TypeScript code from the `.proto` files, run the following command from the `proto` directory:

```bash
make generate
```

## Development Conventions

*   **API:** All API communication between the frontend and backend is done through gRPC. The API is defined in the `.proto` files in the `proto` directory.
*   **Code Generation:** The Go and TypeScript code for the gRPC services and messages is automatically generated using `buf`.
*   **Styling:** The frontend uses Tailwind CSS for styling.
