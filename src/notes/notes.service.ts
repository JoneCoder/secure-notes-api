import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { CreateNoteDto, UpdateNoteDto } from './dto/create-note.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-response.interface';
import { Role } from '../common/enums/role.enum';
import { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private readonly noteModel: Model<NoteDocument>,
  ) {}

  async create(userId: string, createNoteDto: CreateNoteDto): Promise<Note> {
    const createdNote = new this.noteModel({
      ...createNoteDto,
      userId: new Types.ObjectId(userId),
    });
    return createdNote.save();
  }

  /**
   * List notes for the authenticated user with pagination and sorting
   * Supported by Compound index: NoteSchema.index({ userId: 1, createdAt: -1 })
   */
  async findUserNotes(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Note>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { userId: new Types.ObjectId(userId) };

    const [data, total] = await Promise.all([
      this.noteModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.noteModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Admin view: list all notes across all users with pagination and sorting
   * Supported by NoteSchema.index({ createdAt: -1 })
   */
  async findAllNotes(query: PaginationQueryDto): Promise<PaginatedResult<Note>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.noteModel
        .find()
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.noteModel.countDocuments().exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string, currentUser: UserDocument): Promise<Note> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid note ID: ${id}`);
    }

    const note = await this.noteModel.findById(id).populate('userId', 'name email').exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }

    const ownerId = note.userId && (note.userId as any)._id
      ? (note.userId as any)._id.toString()
      : note.userId.toString();

    // Regular users can only access their own notes; Admins can access any note
    if (currentUser.role !== Role.ADMIN && ownerId !== currentUser._id.toString()) {
      throw new ForbiddenException('Access denied: You do not own this note');
    }

    return note;
  }

  async update(
    id: string,
    updateNoteDto: UpdateNoteDto,
    currentUser: UserDocument,
  ): Promise<Note> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid note ID: ${id}`);
    }

    const note = await this.noteModel.findById(id).exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }

    if (currentUser.role !== Role.ADMIN && note.userId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('Access denied: You cannot edit another user\'s note');
    }

    if (updateNoteDto.title !== undefined) {
      note.title = updateNoteDto.title.trim();
    }
    if (updateNoteDto.content !== undefined) {
      note.content = updateNoteDto.content;
    }

    return note.save();
  }

  async remove(
    id: string,
    currentUser: UserDocument,
  ): Promise<{ deleted: boolean; id: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid note ID: ${id}`);
    }

    const note = await this.noteModel.findById(id).exec();
    if (!note) {
      throw new NotFoundException(`Note with ID "${id}" not found`);
    }

    if (currentUser.role !== Role.ADMIN && note.userId.toString() !== currentUser._id.toString()) {
      throw new ForbiddenException('Access denied: You cannot delete another user\'s note');
    }

    await this.noteModel.findByIdAndDelete(id).exec();
    return { deleted: true, id };
  }
}
