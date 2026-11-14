import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type PostDocument = Post & Document;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  authorId: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Explicitly define index per interview requirement
// Supports foreignField lookup: Scenario 2 aggregation (User.aggregate([ { $lookup: { from: 'posts', localField: '_id', foreignField: 'authorId', as: 'posts' } } ]))
PostSchema.index({ authorId: 1, createdAt: -1 });
