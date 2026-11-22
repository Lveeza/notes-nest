import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: string } }>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.user = { id: payload.sub };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
