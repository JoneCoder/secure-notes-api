import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [UsersModule, NotesModule],
  controllers: [AdminController],
})
export class AdminModule {}
