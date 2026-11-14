import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Scenario 2: User Posts ($lookup)
   * Constraint: Use a single aggregation pipeline with a $lookup stage.
   */
  @Get(':id/posts')
  async getUserPosts(@Param('id') id: string) {
    return this.usersService.getUserPosts(id);
  }
}
