import { Module } from '@nestjs/common';
import { NotesService } from './notes.service.js';
import { NotesController } from './notes.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
   imports: [PrismaModule],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
