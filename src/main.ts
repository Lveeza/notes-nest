import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { setupApp } from './setup-app.js';

const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
setupApp(app);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
await bootstrap();
