import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { randomUUID } from 'node:crypto';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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

  test('empty text give 400', async () => {
    await request(app.getHttpServer()).post('/notes').send({}).expect(400);
    await request(app.getHttpServer()).post('/notes').send({ text: '' }).expect(400);
    await request(app.getHttpServer()).post('/notes').send({ text: '   ' }).expect(400);
  });

  test('text length allow 1-500', async () => {
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

  test('extra field give 400' , async () => {
    await request(app.getHttpServer())
      .post('/notes')
      .send({ text: 'note', extra: 'field' })
      .expect(400);
  });

  test('bad id gives 400' , async () => {
    await request(app.getHttpServer())
      .get(`/notes/not-a-uuid`)
      .expect(400);
  });
  
  test('can read, update and delete the second note', async () => {
  const server = app.getHttpServer();
  await request(server).post('/notes').send({ text: 'first' }).expect(201);
  const second = await request(server).post('/notes').send({ text: 'second' }).expect(201);
  const id = second.body.id;

  await request(server).get(`/notes/${id}`).expect(200);
  await request(server).patch(`/notes/${id}`).send({ text: 'changed' }).expect(200);
  await request(server).delete(`/notes/${id}`).expect(200);

  const list = await request(server).get('/notes').expect(200);
  expect(list.body).toHaveLength(1);
  expect(list.body[0].text).toBe('first');
});

});
