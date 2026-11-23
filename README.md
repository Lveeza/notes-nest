# Notes API

A REST API built with NestJS, Prisma, and SQLite. Users register, log in, and manage their own private notes.

## Features

- JWT authentication with argon2 password hashing
- Per-user ownership: a user can only read, change, or delete their own notes
- Input validation (DTOs) that rejects unknown fields
- Pagination and safe text search
- Security: Helmet headers, CORS allow-list, rate limiting
- Structured logs (pino) with secrets hidden
- One error format for all failures, and no internal details in 500 responses
- Unit tests (Vitest) and end-to-end tests (Supertest) on a separate test database
- Swagger docs, Docker image, and GitHub Actions CI

## Tech stack

NestJS, TypeScript, Prisma 7 (SQLite), Vitest, Supertest, Docker, GitHub Actions

## Run it

```bash
git clone https://github.com/<your-username>/notes-nest.git
cd notes-nest
npm install
cp .env.example .env        # then set JWT_SECRET (32+ characters)
npx prisma migrate dev
npx prisma generate
npm run start:dev
```

The API runs at `http://localhost:3000`. Swagger docs are at `http://localhost:3000/docs` (not available when `NODE_ENV=production`).

## Environment variables

| Name           | Required | Description                                                       |
| -------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL` | yes      | SQLite file, for example `file:./dev.db`                          |
| `JWT_SECRET`   | yes      | At least 32 characters. The app refuses to start without it       |
| `PORT`         | no       | Default `3000`                                                    |
| `CORS_ORIGINS` | no       | Comma-separated list of allowed browser origins. Empty means none |

The app checks these values at startup and stops with a clear message if one is wrong.

## API

| Method | Path             | Auth | Description                            |
| ------ | ---------------- | ---- | -------------------------------------- |
| POST   | `/auth/register` | no   | Create a user. Returns `{ id, email }` |
| POST   | `/auth/login`    | no   | Returns `{ token }`                    |
| POST   | `/notes`         | yes  | Create a note                          |
| GET    | `/notes`         | yes  | List your notes                        |
| GET    | `/notes/:id`     | yes  | Get one of your notes                  |
| PATCH  | `/notes/:id`     | yes  | Change the text of one of your notes   |
| DELETE | `/notes/:id`     | yes  | Delete one of your notes               |

Protected routes need the header `Authorization: Bearer <token>`.

**List query parameters** (`GET /notes`):

| Name     | Default | Rules                                                                |
| -------- | ------- | -------------------------------------------------------------------- |
| `limit`  | 20      | 1 to 100                                                             |
| `offset` | 0       | 0 or more                                                            |
| `q`      | none    | Text search, up to 100 characters. `%` and `_` are normal characters |

Response: `{ "data": [...], "total": 42, "limit": 20, "offset": 0 }`

**Error format** (all errors):

```json
{
  "statusCode": 404,
  "message": "Note not found",
  "path": "/notes/...",
  "timestamp": "..."
}
```

**Rate limits:** 100 requests per minute per IP, and 10 per minute on `/auth/*`.

## Test it

```bash
npm test            # unit tests
npm run test:e2e    # end-to-end tests (uses test.db, never dev.db)
```

## Docker

```bash
docker build -t notes-nest .
docker run -p 3000:3000 \
  -e DATABASE_URL=file:/data/notes.db \
  -e JWT_SECRET=<32+ characters> \
  -v notes-data:/data \
  notes-nest
```

The container runs database migrations at startup and keeps the SQLite file in the `notes-data` volume. It stops cleanly on `docker stop`.

## Design decisions

- **404, not 403, for other users' notes.** A 403 would tell an attacker that the note exists.
- **The owner comes from the signed token, never from the request body.** A client can lie in a body, but cannot fake a signed token. Every query also filters by `ownerId`.
- **Same 401 for a wrong password and an unknown email.** The login also hashes a dummy password for unknown emails, so response time does not reveal which emails exist.
- **Separate test database.** End-to-end tests never touch development data, and a guard in the tests checks that they use `test.db`.
- **Validation and the error filter live in `AppModule`, not `main.ts`.** Tests build the app from `AppModule`, so tests and production behave the same.
- **500 errors never show details to the client.** Only errors we throw on purpose show their message. Everything else becomes `Internal server error`, and the real error goes to the log.
- **Search uses a plain substring match.** SQL `LIKE` treats `%` and `_` as wildcards, so a search for `%` matched every note. A test found that bug.
- **Config is checked at startup.** A weak or missing `JWT_SECRET` stops the app before it serves any request.

## License

MIT
