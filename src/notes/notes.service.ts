import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { ListNotesQueryDto } from './dto/list-notes-query.dto.js';

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

  async findAll(ownerId: string, { limit, offset, q }: ListNotesQueryDto) {
    if (!q) {
      const where = { ownerId };
      const [data, total] = await this.prisma.client.$transaction([
        this.prisma.client.note.findMany({
          where,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: limit,
          skip: offset,
        }),
        this.prisma.client.note.count({ where }),
      ]);
      return { data, total, limit, offset };
    }

    const needle = q.toLowerCase();

    const rows = await this.prisma.client.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Note"
      WHERE "ownerId" = ${ownerId} AND instr(lower("text"), ${needle}) > 0
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT ${limit} OFFSET ${offset}`;

    const counted = await this.prisma.client.$queryRaw<
      { total: bigint | number }[]
    >`
      SELECT COUNT(*) AS "total" FROM "Note"
      WHERE "ownerId" = ${ownerId} AND instr(lower("text"), ${needle}) > 0`;

    const notes = await this.prisma.client.note.findMany({
      where: { id: { in: rows.map((r) => r.id) }, ownerId },
    });
    const byId = new Map(notes.map((n) => [n.id, n]));
    const data = rows.map((r) => byId.get(r.id)!);

    return { data, total: Number(counted[0].total), limit, offset };
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
