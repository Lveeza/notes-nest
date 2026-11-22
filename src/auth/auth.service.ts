import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

const DUMMY_HASH = await hash('dummy-password');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private isDuplicateEmail(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  async register(dto: RegisterDto): Promise<{ id: string; email: string }> {
    const passwordHash = await hash(dto.password);
    try {
      return await this.prisma.client.user.create({
        data: { email: dto.email, passwordHash },
        select: { id: true, email: true },
      });
    } catch (error) {
      if (this.isDuplicateEmail(error)) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
  async login(dto: LoginDto): Promise<{ token: string }> {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });
    const ok = await verify(user?.passwordHash ?? DUMMY_HASH, dto.password);
    if (!user || !ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { token: await this.jwt.signAsync({ sub: user.id }) };
  }
}
