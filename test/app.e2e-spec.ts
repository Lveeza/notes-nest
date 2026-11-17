import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { NotesService } from '../src/notes/notes.service.js';

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
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
  test('deleting a missing id returns 404 and keeps existing notes', async () => {
    const created = await request(app.getHttpServer())
      .post('/notes')
      .send({ text: 'keep me' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/notes/${randomUUID()}`)
      .expect(404);

    const list = await request(app.getHttpServer()).get('/notes').expect(200);
    expect(list.body).toEqual([created.body]);
  });

  test('rejects empty or whitespace-only text with 400', async () => {
    await request(app.getHttpServer()).post('/notes').send({}).expect(400);
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: '' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: '   ' })
      .expect(400);
  });

  test('accepts text of 1 to 500 characters and rejects 501', async () => {
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: 'a' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: 'a'.repeat(500) })
      .expect(201);
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: 'a'.repeat(501) })
      .expect(400);
  });

  test('rejects unknown fields with 400', async () => {
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: 'note', extra: 'field' })
      .expect(400);
  });

  test('bad id gives 400', async () => {
    await request(app.getHttpServer()).get(`/notes/not-a-uuid`).expect(400);
  });

  test('can read, update and delete the second note', async () => {
    const server = app.getHttpServer();
    await request(server).post('/notes').send({ text: 'first' }).expect(201);
    const second = await request(server)
      .post('/notes')
      .send({ text: 'second' })
      .expect(201);
    const id = second.body.id;

    await request(server).get(`/notes/${id}`).expect(200);
    await request(server)
      .patch(`/notes/${id}`)
      .send({ text: 'changed' })
      .expect(200);
    await request(server).delete(`/notes/${id}`).expect(200);

    const list = await request(server).get('/notes').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].text).toBe('first');
  });

  test.each([
    ['an empty body', {}],
    ['empty text', { text: '' }],
    ['whitespace-only text', { text: '   ' }],
  ])('PATCH rejects %s with 400', async (_label, body) => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post('/notes')
      .send({ text: 'first' })
      .expect(201);

    await request(server)
      .patch(`/notes/${created.body.id}`)
      .send(body)
      .expect(400);

    const after = await request(server)
      .get(`/notes/${created.body.id}`)
      .expect(200);
    expect(after.body.text).toBe('first');
  });

  test('body has statusCode: 404, a message, and a path' , async() =>{
    await request(app.getHttpServer()).get(`/notes/${randomUUID()}`).expect(404);
  });

   test('validation errors return message as an array', async () => {
  const res = await request(app.getHttpServer())
    .post('/notes')
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

  const res = await request(crashApp.getHttpServer()).get('/notes').expect(500);

  expect(res.body.message).toBe('Internal server error');
  expect(JSON.stringify(res.body)).not.toContain('secret db password');

  await crashApp.close();
});

});


