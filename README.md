# Secure Notes API (NestJS + MongoDB + Mongoose)

Backend API service for Secure Notes built with NestJS, MongoDB, Mongoose, and Serverless support for Vercel.

## Tech Stack
- **Framework**: NestJS 11 (TypeScript)
- **Database**: MongoDB 7
- **ODM**: Mongoose 9 (`@nestjs/mongoose`)
- **Authentication**: JWT (`@nestjs/jwt`, `passport-jwt`, `bcryptjs`)
- **Validation**: `class-validator`, `class-transformer`
- **Serverless**: Vercel Serverless Functions (`@vercel/node`)
- **Containerization**: Docker & Docker Compose

## Environment Variables

Create `.env` file based on `.env.example`:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/secure_notes
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=super_secure_notes_jwt_secret_key_interview_2026_xyz
JWT_EXPIRES_IN=7d
```

---

## Deploying to Vercel (Serverless)

The repository is pre-configured with `vercel.json` and `api/index.ts` serverless adapter.

### 1. Requirements for Vercel
- A cloud MongoDB database (such as a free **MongoDB Atlas** cluster).
- In MongoDB Atlas:
  - Network Access: Allow access from anywhere (`0.0.0.0/0`) since Vercel uses dynamic serverless IPs.
  - Database User: Create a user with Read & Write access.

### 2. Deployment Steps

#### Option A: Via Vercel Dashboard (Recommended)
1. Push this project to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New..." -> "Project"**.
3. Import the `secure-notes-api` repository.
4. Set Framework Preset: **Other**.
5. Add the following **Environment Variables**:
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/secure_notes?retryWrites=true&w=majority`
   - `JWT_SECRET`: `your_strong_jwt_secret_key`
   - `JWT_EXPIRES_IN`: `7d`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `https://your-frontend.vercel.app`
6. Click **Deploy**.

#### Option B: Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

---

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start MongoDB:
```bash
docker compose up -d mongodb
```

3. Seed the database with sample users, notes, and posts:
```bash
npm run seed
```

4. Run the automated verification suite:
```bash
npm run verify
```

5. Start the development server:
```bash
npm run start:dev
```
API will run on: `http://localhost:8000/api/v1`

---

## Pre-Seeded Accounts
- **Admin**: `admin@example.com` / `Admin@123456`
- **Users**:
  - `alice@example.com` / `User@123456` (interests: `['chess', 'reading', 'tech']`)
  - `bob@example.com` / `User@123456` (interests: `['reading', 'gaming', 'tech']`)
  - `charlie@example.com` / `User@123456` (interests: `['chess', 'travel']`)
