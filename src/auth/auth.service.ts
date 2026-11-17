import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
}
