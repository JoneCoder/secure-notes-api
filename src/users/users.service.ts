import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-response.interface';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * List users with pagination and indexed sorting by createdAt: -1
   */
  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<User>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    // Supported by UserSchema.index({ createdAt: -1 })
    const [data, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password')
        .exec(),
      this.userModel.countDocuments().exec(),
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

  async findById(id: string): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid user ID: ${id}`);
    }

    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const normalizedEmail = createUserDto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    const user = new this.userModel({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const saved = await user.save();
    return this.findById(saved._id.toString());
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid user ID: ${id}`);
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    if (updateUserDto.email) {
      const normalizedEmail = updateUserDto.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const conflict = await this.userModel.findOne({ email: normalizedEmail }).exec();
        if (conflict) {
          throw new ConflictException('Email already taken by another user');
        }
        user.email = normalizedEmail;
      }
    }

    if (updateUserDto.name) {
      user.name = updateUserDto.name.trim();
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(updateUserDto.password, salt);
    }

    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.interests) {
      user.interests = updateUserDto.interests;
    }

    await user.save();
    return this.findById(id);
  }

  async remove(id: string, currentAdminId: string): Promise<{ deleted: boolean; id: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid user ID: ${id}`);
    }

    // Safety 1: Admin cannot delete themselves
    if (id === currentAdminId) {
      throw new BadRequestException('Admins cannot delete their own account');
    }

    const targetUser = await this.userModel.findById(id).exec();
    if (!targetUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Safety 2: Protect the last admin account
    if (targetUser.role === Role.ADMIN) {
      const adminCount = await this.userModel.countDocuments({ role: Role.ADMIN }).exec();
      if (adminCount <= 1) {
        throw new BadRequestException('Cannot delete the last remaining administrator account');
      }
    }

    await this.userModel.findByIdAndDelete(id).exec();
    return { deleted: true, id };
  }

  /**
   * Scenario 1: Group Users by Interests
   * Constraint: Exactly ONE collection.aggregate() call.
   * Supported by multikey index on interests: UserSchema.index({ interests: 1 })
   */
  async getGroupedByInterests(): Promise<any[]> {
    return this.userModel.aggregate([
      // 1. Only consider users who have non-empty interests array
      {
        $match: {
          interests: { $exists: true, $not: { $size: 0 } },
        },
      },
      // 2. Unwind the interests array
      {
        $unwind: '$interests',
      },
      // 3. Group by interest
      {
        $group: {
          _id: '$interests',
          userCount: { $sum: 1 },
          users: {
            $push: {
              _id: '$_id',
              name: '$name',
              email: '$email',
              role: '$role',
              createdAt: '$createdAt',
            },
          },
        },
      },
      // 4. Project clean output schema
      {
        $project: {
          _id: 0,
          interest: '$_id',
          userCount: 1,
          users: 1,
        },
      },
      // 5. Sort alphabetically by interest
      {
        $sort: { interest: 1 },
      },
    ]);
  }

  /**
   * Scenario 2: User Posts ($lookup)
   * Constraint: Use a single aggregation pipeline with a $lookup stage.
   * Supported by PostSchema.index({ authorId: 1, createdAt: -1 })
   */
  async getUserPosts(userId: string): Promise<any> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user ID: ${userId}`);
    }

    const objectId = new Types.ObjectId(userId);

    const result = await this.userModel.aggregate([
      // 1. Filter for the targeted user
      {
        $match: {
          _id: objectId,
        },
      },
      // 2. Join with posts collection using $lookup
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'authorId',
          as: 'posts',
          pipeline: [
            {
              $sort: { createdAt: -1 },
            },
          ],
        },
      },
      // 3. Project safe fields, completely omitting password hash
      {
        $project: {
          password: 0,
          __v: 0,
        },
      },
    ]);

    if (!result || result.length === 0) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return result[0];
  }
}
