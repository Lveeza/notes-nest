import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotesService } from './notes.service.js';

describe('NotesService', () => {
  let service: NotesService;
  const note = { findUnique: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: { client: { note } } }, // the fake
      ],
    }).compile();
    service = moduleRef.get(NotesService);
  });

  test('findOne throws NotFoundException when the note does not exist', async () => {
    note.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  test('findOne returns the note when it exists', async () => {
    const saved = { id: '1', text: 'hi', createdAt: new Date() };
    note.findUnique.mockResolvedValue(saved);

    await expect(service.findOne('1')).resolves.toEqual(saved);
    expect(note.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});