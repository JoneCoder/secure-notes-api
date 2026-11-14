import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto, UpdateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
  ) {}

  async create(createNoteDto: CreateNoteDto): Promise<Note> {
    const createdNote = new this.noteModel(createNoteDto);
    return createdNote.save();
  }

  async findAll(): Promise<Note[]> {
    return this.noteModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Note> {
    const note = await this.noteModel.findById(id).exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    return note;
  }

  async update(id: string, updateNoteDto: UpdateNoteDto): Promise<Note> {
    const updatedNote = await this.noteModel
      .findByIdAndUpdate(id, updateNoteDto, { new: true })
      .exec();
    if (!updatedNote) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    return updatedNote;
  }

  async remove(id: string): Promise<{ deleted: boolean; id: string }> {
    const result = await this.noteModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }
    return { deleted: true, id };
  }
}
