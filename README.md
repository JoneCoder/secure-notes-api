# Secure Notes API (NestJS + MongoDB + Mongoose)

Backend API service for Secure Notes built with NestJS, MongoDB, Mongoose, and Docker.

## Tech Stack
- **Framework**: NestJS 11 (TypeScript)
- **Database**: MongoDB 7
- **ODM**: Mongoose 9 (`@nestjs/mongoose`)
- **Environment**: `@nestjs/config` (`.env`)
- **Containerization**: Docker & Docker Compose

## Environment Variables (.env)
Create `.env` file in the root directory (based on `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/secure_notes
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Running with Docker (Recommended)

1. Make sure Docker is running.
2. Start MongoDB and NestJS API with Docker Compose:
```bash
docker compose up -d --build
```
- API will be accessible at: `http://localhost:5000/api`
- MongoDB will be running on: `localhost:27017`

To view logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start MongoDB (either locally or run `docker compose up -d mongodb`).

3. Start NestJS API in development mode:
```bash
npm run start:dev
```

4. Build and run production:
```bash
npm run build
npm run start:prod
```

## API Endpoints
- `GET /api` - Health check & status
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create a note `{ title, content, isEncrypted? }`
- `GET /api/notes/:id` - Get single note
- `PATCH /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
