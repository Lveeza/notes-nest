import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { NotesService } from '../src/notes/notes.service.js';

import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    expect(process.env.DATABASE_URL).toContain('test.db');
  });

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    await app.get(PrismaService).client.note.deleteMany();
    await app.get(PrismaService).client.user.deleteMany();
  });

  async function authHeader(
    target: INestApplication<App> = app,
    email = 'sam@example.com',
  ) {
    const creds = { email, password: 'secret123' };
    await request(target.getHttpServer())
      .post('/auth/register')
      .send(creds)
      .expect(201);
    const res = await request(target.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(200);
    return { Authorization: `Bearer ${res.body.token}` };
  }

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app?.close();
  });

  test('deleting a missing id returns 404 and keeps existing notes', async () => {
    const auth = await authHeader();
    const created = await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({ text: 'keep me' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/notes/${randomUUID()}`)
      .set(auth)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get('/notes')
      .set(auth)
      .expect(200);
    expect(list.body).toEqual([created.body]);
  });

  test('rejects empty or whitespace-only text with 400', async () => {
    const auth = await authHeader();
    for (const body of [{}, { text: '' }, { text: '   ' }]) {
      await request(app.getHttpServer())
        .post('/notes')
        .set(auth)
        .send(body)
        .expect(400);
    }
  });

  test('accepts text of 1 to 500 characters and rejects 501', async () => {
    const auth = await authHeader();
    await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({ text: 'a' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({ text: 'a'.repeat(500) })
      .expect(201);
    await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({ text: 'a'.repeat(501) })
      .expect(400);
  });

  test('rejects unknown fields with 400', async () => {
    const auth = await authHeader();
    await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({ text: 'note', extra: 'field' })
      .expect(400);
  });

  test('bad id gives 400', async () => {
    const auth = await authHeader();
    await request(app.getHttpServer())
      .get('/notes/not-a-uuid')
      .set(auth)
      .expect(400);
  });

  test('can read, update and delete the second note', async () => {
    const server = app.getHttpServer();
    const auth = await authHeader();
    await request(server)
      .post('/notes')
      .set(auth)
      .send({ text: 'first' })
      .expect(201);
    const second = await request(server)
      .post('/notes')
      .set(auth)
      .send({ text: 'second' })
      .expect(201);
    const id = second.body.id;

    await request(server).get(`/notes/${id}`).set(auth).expect(200);
    await request(server)
      .patch(`/notes/${id}`)
      .set(auth)
      .send({ text: 'changed' })
      .expect(200);
    await request(server).delete(`/notes/${id}`).set(auth).expect(200);

    const list = await request(server).get('/notes').set(auth).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].text).toBe('first');
  });

  test.each([
    ['an empty body', {}],
    ['empty text', { text: '' }],
    ['whitespace-only text', { text: '   ' }],
  ])('PATCH rejects %s with 400', async (_label, body) => {
    const server = app.getHttpServer();
    const auth = await authHeader();
    const created = await request(server)
      .post('/notes')
      .set(auth)
      .send({ text: 'first' })
      .expect(201);

    await request(server)
      .patch(`/notes/${created.body.id}`)
      .set(auth)
      .send(body)
      .expect(400);

    const after = await request(server)
      .get(`/notes/${created.body.id}`)
      .set(auth)
      .expect(200);
    expect(after.body.text).toBe('first');
  });

  test('body has statusCode: 404, a message, and a path', async () => {
    const auth = await authHeader();
    const id = randomUUID();
    const res = await request(app.getHttpServer())
      .get(`/notes/${id}`)
      .set(auth)
      .expect(404);

    expect(res.body.statusCode).toBe(404);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.path).toBe(`/notes/${id}`);
  });

  test('validation errors return message as an array', async () => {
    const auth = await authHeader();
    const res = await request(app.getHttpServer())
      .post('/notes')
      .set(auth)
      .send({ text: '', extra: 1 })
      .expect(400);

    expect(res.body.statusCode).toBe(400);
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  test('500 errors do not leak internal details', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(NotesService)
      .useValue({
        findAll: () => {
          throw new Error('secret db password');
        },
      })
      .compile();

    const crashApp = moduleRef.createNestApplication();
    await crashApp.init();
    const auth = await authHeader(crashApp); // token from THIS app

    const res = await request(crashApp.getHttpServer())
      .get('/notes')
      .set(auth)
      .expect(500);

    expect(res.body.message).toBe('Internal server error');
    expect(JSON.stringify(res.body)).not.toContain('secret db password');

    await crashApp.close();
  });

  describe('POST /auth/register', () => {
    const valid = { email: 'sam@example.com', password: 'secret123' };

    test('creates a user and never returns the password or hash', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(valid)
        .expect(201);

      expect(res.body).toEqual({
        id: expect.any(String),
        email: 'sam@example.com',
      });
      expect(JSON.stringify(res.body)).not.toContain('secret123');
      expect(res.body.passwordHash).toBeUndefined();
    });

    test('stores an argon2 hash, not the plain password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(valid)
        .expect(201);

      const user = await app
        .get(PrismaService)
        .client.user.findUnique({ where: { email: valid.email } });
      expect(user!.passwordHash).not.toBe(valid.password);
      expect(user!.passwordHash.startsWith('$argon2')).toBe(true);
    });

    test('rejects a duplicate email with 409', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(valid)
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(valid)
        .expect(409);
    });

    test('treats emails as case-insensitive', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(valid)
        .expect(201);
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...valid, email: 'SAM@Example.com' })
        .expect(409);
    });

    test.each([
      ['a bad email', { email: 'abc', password: 'secret123' }],
      [
        'a 7-character password',
        { email: 'a@example.com', password: '1234567' },
      ],
      ['a missing password', { email: 'a@example.com' }],
      ['an extra field', { ...valid, role: 'admin' }],
    ])('rejects %s with 400', async (_label, body) => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(body)
        .expect(400);
    });
    test('returns 500 (not 201) when the database fails', async () => {
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue({
          client: {
            user: { create: () => Promise.reject(new Error('db down')) },
          },
        })
        .compile();
      const crashApp = moduleRef.createNestApplication();
      await crashApp.init();

      await request(crashApp.getHttpServer())
        .post('/auth/register')
        .send(valid)
        .expect(500);
      await crashApp.close();
    });
  });

  describe('login and JWT guard', () => {
    const creds = { email: 'sam@example.com', password: 'secret123' };

    async function getToken(): Promise<string> {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(creds)
        .expect(201);
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(creds)
        .expect(200);
      return res.body.token;
    }

    test('login returns a token for correct credentials', async () => {
      expect(typeof (await getToken())).toBe('string');
    });

    test('wrong password and unknown email give the same 401', async () => {
      await getToken();
      const wrong = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...creds, password: 'nope-nope' });
      const unknown = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'nope-nope' });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    test('GET /notes without a token returns 401', async () => {
      await request(app.getHttpServer()).get('/notes').expect(401);
    });

    test.each([
      ['a tampered token', async (t: string) => `${t}x`],
      [
        'an expired token',
        async () =>
          new JwtService({ secret: process.env.JWT_SECRET }).signAsync(
            { sub: 'x' },
            { expiresIn: '-1s' },
          ),
      ],
      [
        'a token with another secret',
        async () =>
          new JwtService({
            secret: 'another-secret-another-secret-123456',
          }).signAsync({ sub: 'x' }),
      ],
    ])('rejects %s with 401', async (_label, makeBad) => {
      const bad = await makeBad(await getToken());
      await request(app.getHttpServer())
        .get('/notes')
        .set('Authorization', `Bearer ${bad}`)
        .expect(401);
    });

    test('a valid token returns 200', async () => {
      const token = await getToken();
      await request(app.getHttpServer())
        .get('/notes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
    describe('note ownership', () => {
      test("a user cannot read, change or delete another user's note", async () => {
        const alice = await authHeader(app, 'alice@example.com');
        const bob = await authHeader(app, 'bob@example.com');
        const created = await request(app.getHttpServer())
          .post('/notes')
          .set(alice)
          .send({ text: 'private' })
          .expect(201);
        const id = created.body.id;

        await request(app.getHttpServer())
          .get(`/notes/${id}`)
          .set(bob)
          .expect(404);
        await request(app.getHttpServer())
          .patch(`/notes/${id}`)
          .set(bob)
          .send({ text: 'hacked' })
          .expect(404);
        await request(app.getHttpServer())
          .delete(`/notes/${id}`)
          .set(bob)
          .expect(404);

        const bobList = await request(app.getHttpServer())
          .get('/notes')
          .set(bob)
          .expect(200);
        expect(bobList.body).toHaveLength(0);

        const aliceNote = await request(app.getHttpServer())
          .get(`/notes/${id}`)
          .set(alice)
          .expect(200);
        expect(aliceNote.body.text).toBe('private'); // unchanged
      });
    });
  });
  describe('note ownership', () => {
    async function setup() {
      const server = app.getHttpServer();
      const alice = await authHeader(app, 'alice@example.com');
      const bob = await authHeader(app, 'bob@example.com');
      const created = await request(server)
        .post('/notes')
        .set(alice)
        .send({ text: 'private' })
        .expect(201);
      return { server, alice, bob, id: created.body.id as string };
    }

    test.each([
      [
        'read',
        (s: any, h: any, id: string) => request(s).get(`/notes/${id}`).set(h),
      ],
      [
        'change',
        (s: any, h: any, id: string) =>
          request(s).patch(`/notes/${id}`).set(h).send({ text: 'hacked' }),
      ],
      [
        'delete',
        (s: any, h: any, id: string) =>
          request(s).delete(`/notes/${id}`).set(h),
      ],
    ])(
      "another user cannot %s someone else's note",
      async (_action, attempt) => {
        const { server, alice, bob, id } = await setup();

        await attempt(server, bob, id).expect(404);

        // the owner's note is untouched
        const mine = await request(server)
          .get(`/notes/${id}`)
          .set(alice)
          .expect(200);
        expect(mine.body.text).toBe('private');
      },
    );

    test('each user lists only their own notes', async () => {
      const { server, alice, bob } = await setup();

      const bobList = await request(server).get('/notes').set(bob).expect(200);
      expect(bobList.body).toHaveLength(0);

      const aliceList = await request(server)
        .get('/notes')
        .set(alice)
        .expect(200);
      expect(aliceList.body).toHaveLength(1);
    });

    test('the owner is taken from the token, not from the body', async () => {
      const { server, alice } = await setup();
      await request(server)
        .post('/notes')
        .set(alice)
        .send({ text: 'x', ownerId: 'someone-else' })
        .expect(400);
    });
  });
});
