import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import {randomUUID} from 'node:crypto';

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
  const created = await request(app.getHttpServer()).post('/notes').send({ text: 'keep me' }).expect(201);

  await request(app.getHttpServer()).delete(`/notes/${randomUUID()}`).expect(404);

  const list = await request(app.getHttpServer()).get('/notes').expect(200);
  expect(list.body).toEqual([created.body]); 
});
});
