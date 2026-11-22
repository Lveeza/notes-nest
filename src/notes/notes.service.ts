import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  private isNotFound(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  async create(ownerId: string, dto: CreateNoteDto) {
    return await this.prisma.client.note.create({
      data: { text: dto.text, ownerId },
    });
  }

  async findAll(ownerId: string) {
    return await this.prisma.client.note.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(ownerId: string, id: string) {
    const note = await this.prisma.client.note.findFirst({
      where: { id, ownerId },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(ownerId: string, id: string, dto: UpdateNoteDto) {
    try {
      return await this.prisma.client.note.update({
        where: { id, ownerId },
        data: { text: dto.text },
      });
    } catch (error) {
      if (this.isNotFound(error)) throw new NotFoundException('Note not found');
      throw error;
    }
  }

  async remove(ownerId: string, id: string) {
    try {
      return await this.prisma.client.note.delete({ where: { id, ownerId } });
    } catch (error) {
      if (this.isNotFound(error)) throw new NotFoundException('Note not found');
      throw error;
    }
  }
}
