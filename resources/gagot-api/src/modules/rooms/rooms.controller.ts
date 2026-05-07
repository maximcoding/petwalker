import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiTags} from '@nestjs/swagger';
import {ObjectIdValidationPipe} from '../../helpers/object-id.validation.pipe';
import {RoomsService} from './rooms.service';
import {IRoom} from './room.schema';
import {CreateRoomPayload} from './payloads/create-room.payload';
import {ApiImageFile} from '../files/api-file.decorator';
import {FileExtender} from '../files/file.extender.interceptor';
import {FileInterceptor} from '@nestjs/platform-express';
import {DeleteImagePayload} from '../properties/payload/query-property.payload';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';

@ApiTags('Property Rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Controller(ModelEnum.Rooms)
export class RoomsController {
  constructor(private service: RoomsService) {}

  @Get(':id')
  async findById(@Param('id', ObjectIdValidationPipe) id: string): Promise<IRoom> {
    return await this.service.findById(id);
  }

  @Get('property')
  async findByProperty(@Param('propertyId', ObjectIdValidationPipe) propertyId: string): Promise<IRoom[]> {
    return await this.service.findByProperty(propertyId);
  }

  @Post('create')
  @ApiCreatedResponse({description: 'The room has been successfully created.'})
  async create(@Body() payload: CreateRoomPayload): Promise<IRoom> {
    return await this.service.create(payload);
  }

  @Post('create/bulk')
  @ApiCreatedResponse({description: 'The rooms has been successfully created.'})
  async createBulk(@Body() payload: CreateRoomPayload[]): Promise<IRoom[]> {
    return await this.service.createBulk(payload);
  }

  @Patch(':id')
  async updateById(@Param('id', ObjectIdValidationPipe) id: string, @Body() data: any): Promise<IRoom> {
    return await this.service.update(id, data);
  }

  @Post('upload/image')
  @ApiConsumes('multipart/form-data')
  @ApiImageFile()
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('propertyId', ObjectIdValidationPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query() query: DeleteImagePayload,
  ): Promise<IRoom> {
    return await this.service.uploadRoomImage(id, file, query.type);
  }

  @Delete('image')
  async deleteImage(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Param('fileId', ObjectIdValidationPipe) fileId: string,
    @Query() query: DeleteImagePayload,
  ): Promise<void> {
    await this.service.deleteRoomImage(id, fileId, query.type);
  }

  @Delete('images')
  async deleteImages(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query() query: DeleteImagePayload,
  ): Promise<void> {
    await this.service.deleteRoomImages(id, query.type);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdValidationPipe) id: string) {
    return await this.service.delete(id);
  }
}
