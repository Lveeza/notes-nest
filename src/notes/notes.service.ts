import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto.js';
import { UpdateNoteDto } from './dto/update-note.dto.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class NotesService {
  private notes: { id: string; text: string }[] = [];
  create(createNoteDto: CreateNoteDto) {
    const note = { id: randomUUID(), text: createNoteDto.text };
    this.notes.push(note);
    return note;
  }

  findAll() {
    return [...this.notes];
  }
  private findIndexOrThrow(id: string): number {
    const index = this.notes.findIndex((note) => note.id === id);
    if (index === -1) {
      throw new NotFoundException('Note not found');
    }
    return index;
  }

  findOne(id: string) {
    return this.notes[this.findIndexOrThrow(id)];
  }

  update(id: string, updateNoteDto: UpdateNoteDto) {
    const index = this.findIndexOrThrow(id);
    const current = this.notes[index];
    this.notes[index] = {
      ...current,
      text: updateNoteDto.text ?? current.text,
    };
    return this.notes[index];
  }

  remove(id: string) {
    const index = this.findIndexOrThrow(id);
    const [removed] = this.notes.splice(index, 1);
    return removed;
  }
}
