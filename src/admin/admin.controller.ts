import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UsersService } from '../users/users.service';
import { NotesService } from '../notes/notes.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notesService: NotesService,
  ) {}

  /**
   * Admin lists all users with pagination and indexed sorting
   */
  @Get('users')
  async getAllUsers(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  /**
   * Scenario 1: Group Users by Interests
   * Constraint: Exactly ONE collection.aggregate() call.
   */
  @Get('users/group-by-interests')
  async getGroupedByInterests() {
    return this.usersService.getGroupedByInterests();
  }

  /**
   * Admin creates a new user
   */
  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Admin fetches a single user's details
   */
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  /**
   * Admin updates a user's information
   */
  @Put('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   * Admin deletes a user (with self-deletion and last-admin protections)
   */
  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('_id') currentAdminId: string,
  ) {
    return this.usersService.remove(id, currentAdminId.toString());
  }

  /**
   * Admin lists everyone's notes with pagination and sorting
   */
  @Get('notes')
  async getAllNotes(@Query() query: PaginationQueryDto) {
    return this.notesService.findAllNotes(query);
  }
}
