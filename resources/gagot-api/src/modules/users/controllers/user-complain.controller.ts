import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common';
import {ModelEnum} from '../../../enums/model.enum';
import {UserComplainService} from '../services/user-complain.service';
import {ApiBearerAuth, ApiResponse, ApiTags} from '@nestjs/swagger';
import {ComplainPayload} from '../payloads/complain.payload';
import {ComplainDocument} from '../schemas/complain.schema';
import {JwtAuthGuard} from '../../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../../auth/guards/roles.guard';

@ApiTags('User Complains')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller(ModelEnum.Users + '/' + ModelEnum.Complains)
export class UserComplainController {
  constructor(private service: UserComplainService) {}

  @Get()
  @ApiResponse({status: 200, description: 'Found'})
  async findAll(): Promise<ComplainDocument[]> {
    return this.service.findAll();
  }

  @Post()
  @ApiResponse({status: 201, description: 'Created'})
  async create(@Body() payload: ComplainPayload): Promise<ComplainDocument> {
    return await this.service.create(payload);
  }
}
