import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  @Prop({ type: [String], default: [] })
  interests: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Explicitly define indexes per interview requirement
// 1. Unique index on email for login / registration query optimization
UserSchema.index({ email: 1 }, { unique: true });

// 2. Index for admin paginated user list sorted by creation date
UserSchema.index({ createdAt: -1 });

// 3. Multikey index for interest-based aggregation and queries
UserSchema.index({ interests: 1 });
