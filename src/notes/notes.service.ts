import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  private isNotFound(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    );
  }

  async create(createNoteDto: CreateNoteDto) {
    return await this.prisma.client.note.create({
      data: { text: createNoteDto.text },
    });
  }

  async findAll() {
    return await this.prisma.client.note.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string) {
    const note = await this.prisma.client.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto) {
    try {
      return await this.prisma.client.note.update({
        where: { id },
        data: { text: updateNoteDto.text },
      });
    } catch (error) {
      if (this.isNotFound(error)) throw new NotFoundException('Note not found');
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.client.note.delete({
        where: { id },
      });
    } catch (error) {
      if (this.isNotFound(error)) throw new NotFoundException('Note not found');
      throw error;
    }
  }
}
