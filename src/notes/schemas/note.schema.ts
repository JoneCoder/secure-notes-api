import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type NoteDocument = Note & Document;

@Schema({ timestamps: true })
export class Note {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

// Explicitly define indexes per interview requirement
// 1. Compound index (ESR rule: Equality on userId, Sort on createdAt: -1) for user listing their own notes with pagination
NoteSchema.index({ userId: 1, createdAt: -1 });

// 2. Single field sort index for admin viewing everyone's notes with pagination
NoteSchema.index({ createdAt: -1 });
