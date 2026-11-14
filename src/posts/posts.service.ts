import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<PostDocument>,
  ) {}

  async create(authorId: string, createPostDto: CreatePostDto): Promise<Post> {
    if (!Types.ObjectId.isValid(authorId)) {
      throw new BadRequestException(`Invalid author ID: ${authorId}`);
    }

    const post = new this.postModel({
      ...createPostDto,
      authorId: new Types.ObjectId(authorId),
    });

    return post.save();
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResult<Post>> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.postModel
        .find()
        .populate('authorId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.postModel.countDocuments().exec(),
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

  async findByAuthor(authorId: string): Promise<Post[]> {
    if (!Types.ObjectId.isValid(authorId)) {
      throw new BadRequestException(`Invalid author ID: ${authorId}`);
    }

    // Supported by PostSchema.index({ authorId: 1, createdAt: -1 })
    return this.postModel
      .find({ authorId: new Types.ObjectId(authorId) })
      .sort({ createdAt: -1 })
      .exec();
  }
}
