import {Controller, Get, UseGuards} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {Recent} from './recent.document';
import {RecentService} from './recent.service';
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';

@ApiTags('Recent')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller(ModelEnum.Recent)
export class RecentController {
  constructor(private service: RecentService) {}

  @Get()
  async findAll(): Promise<Recent[]> {
    return this.service.findAll();
  }
}
