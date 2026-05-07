import {Body, Controller, Delete, Get, Param, Post, UseGuards} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {ReviewsService} from './reviews.service';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {ObjectIdValidationPipe} from '../../helpers/object-id.validation.pipe';
import {ReviewDocument} from './review.schema';
import {RolesGuard} from '../auth/guards/roles.guard';

@ApiTags('User Reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller(ModelEnum.Reviews)
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get('all')
  async findAll(): Promise<ReviewDocument[]> {
    return this.service.findAll();
  }

  @Get(':propertyId')
  async findByProperty(@Param('id', ObjectIdValidationPipe) propertyId: string): Promise<ReviewDocument[]> {
    return this.service.findByProperty(propertyId);
  }

  @Get(':authorId')
  async findByAuthor(@Param('id', ObjectIdValidationPipe) authorId: string): Promise<ReviewDocument[]> {
    return this.service.findByAuthor(authorId);
  }

  @Post()
  async create(@Body() payload): Promise<ReviewDocument> {
    return this.service.create(payload);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdValidationPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
