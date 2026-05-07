import {ApiBearerAuth, ApiTags} from '@nestjs/swagger';
import {Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards} from '@nestjs/common';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {ModelEnum} from '../../enums/model.enum';
import {PropertiesService} from '../properties/properties.service';
import {ObjectIdValidationPipe} from '../../helpers/object-id.validation.pipe';
import {IRoom} from '../rooms/room.schema';
import {VisitsService} from './visits.service';
import {IVisit} from './visit.schema';
import {CreateVisitPayload} from './payloads/create-visit.payload';
import {UpdateVisitPayload} from './payloads/update-visit-payload';
import {RolesGuard} from '../auth/guards/roles.guard';

@ApiTags('Visits')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller(ModelEnum.Visits)
export class VisitsController {
  constructor(private service: VisitsService) {}

  @Post()
  async create(@Body() payload: CreateVisitPayload): Promise<IVisit> {
    return await this.service.create(payload);
  }

  @Post('bulk/property')
  async createBulk(
    @Query('id', ObjectIdValidationPipe) propertyId: string,
    @Body() payload: CreateVisitPayload[],
  ): Promise<IVisit[]> {
    return await this.service.createBulk(propertyId, payload);
  }

  @Get(':id')
  async findById(@Param('id', ObjectIdValidationPipe) id: string): Promise<IVisit> {
    return await this.service.findById(id);
  }

  @Get('property')
  async findByProperty(@Query('id', ObjectIdValidationPipe) id: string): Promise<IVisit[]> {
    return await this.service.findByProperty(id);
  }

  @Patch(':id')
  async update(@Param('id', ObjectIdValidationPipe) id: string, @Body() payload: UpdateVisitPayload): Promise<IVisit> {
    return await this.service.update(id, payload);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdValidationPipe) id: string): Promise<void> {
    return await this.service.remove(id);
  }

  @Put(':id/add/visitor')
  async enrollVisitor(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query('userId', ObjectIdValidationPipe) userId: string,
  ): Promise<IVisit> {
    return await this.service.addVisitor(id, userId);
  }

  @Delete(':id/remove/visitor')
  async removeVisitor(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query('userId', ObjectIdValidationPipe) userId: string,
  ): Promise<IVisit> {
    return await this.service.removeVisitor(id, userId);
  }
}
