import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser('_id') authorId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(authorId, createPostDto);
  }

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.postsService.findAll(query);
  }
}
