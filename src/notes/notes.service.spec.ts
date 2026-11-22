import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotesService } from './notes.service.js';

describe('NotesService', () => {
  let service: NotesService;
  const note = { findFirst: vi.fn() };

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
    note.findFirst.mockResolvedValue(null);
    await expect(service.findOne('owner-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  test('findOne returns the note when it exists', async () => {
    const saved = {
      id: '1',
      text: 'hi',
      ownerId: 'owner-1',
      createdAt: new Date(),
    };
    note.findFirst.mockResolvedValue(saved);

    await expect(service.findOne('owner-1', '1')).resolves.toEqual(saved);
    expect(note.findFirst).toHaveBeenCalledWith({
      where: { id: '1', ownerId: 'owner-1' },
    });
  });
});
