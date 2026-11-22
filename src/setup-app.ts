import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.use(helmet());
  app.enableCors({ origin: config.getOrThrow<string[]>('CORS_ORIGINS') });
}
