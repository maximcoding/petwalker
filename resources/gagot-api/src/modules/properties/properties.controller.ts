import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {PropertiesService} from './properties.service';
import {CreatePropertyPayload} from './payload/create-property.payload';
import {PatchPropertyPayload} from './payload/patch-property.payload';
import {IProperty} from './propertySchema';
import {ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiTags} from '@nestjs/swagger';
import {ObjectIdValidationPipe} from '../../helpers/object-id.validation.pipe';
import {
  DeleteDocPayload,
  DeleteImagePayload,
  IFindAllPropertiesResponse,
  QueryPropertiesByAddressPayload,
  QueryPropertiesByCategoryPayload,
  QueryPropertiesByTextPayload,
  QueryPropertiesByTypePayload,
  QueryPropertiesPayload,
  UpdateAdditionalDetailsStatusPayload,
  UpdatePropertyStatusPayload,
} from './payload/query-property.payload';
import {FileFieldsInterceptor, FileInterceptor, FilesInterceptor} from '@nestjs/platform-express';
import {ApiMultiFile} from '../files/api-multiple-files.decorator';
import {FileExtender} from '../files/file.extender.interceptor';
import {IAppFile} from '../files/aws-file.schema';
import {ApiAudioFile, ApiDocFile, ApiImageFile, ApiVideoFile} from '../files/api-file.decorator';
import {AuthUser} from '../users/user.decorator';
import {UserDocument} from '../users/schemas/user.schema';
import {FilterPropertiesPayload} from './payload/filter-properties.payload';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {RolesGuard} from '../auth/guards/roles.guard';
import {IUser} from '../users/interfaces/user.interface';

const multerOptions = {limits: {fileSize: +process.env.APP_MAX_FILE_SIZE}};

@ApiTags('Houses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller(ModelEnum.Properties)
export class PropertiesController {
  constructor(private service: PropertiesService) {}

  @Get('all')
  async findAll(@Query() payload: QueryPropertiesPayload): Promise<IFindAllPropertiesResponse> {
    return await this.service.findAll(payload);
  }

  @Get('me')
  async findMine(
    @AuthUser() user: IUser,
    @Query() payload: QueryPropertiesPayload,
  ): Promise<IFindAllPropertiesResponse> {
    return await this.service.findAll(payload, {user: user._id});
  }

  @Post('all/filter')
  async filterProperties(@Body() payload: FilterPropertiesPayload): Promise<IFindAllPropertiesResponse> {
    return await this.service.filterProperties(payload);
  }

  @Get(':id')
  async findById(@Param('id', ObjectIdValidationPipe) id: string): Promise<IProperty> {
    return await this.service.findByIdPopulate(id);
  }

  @Get('search/freeText')
  async search(@Query() query: QueryPropertiesByTextPayload): Promise<IFindAllPropertiesResponse> {
    let filter = {};
    if (query.freeText) {
      const regexStr = new RegExp(query.freeText?.trim(), 'i');
      filter = {
        $or: [{title: regexStr}, {description: regexStr}],
      };
    }
    return await this.service.findAll(query, filter);
  }

  @Get('search/category')
  async findByCategory(@Query() query: QueryPropertiesByCategoryPayload): Promise<IFindAllPropertiesResponse> {
    return await this.service.findByCategory(query);
  }

  @Get('search/state')
  async findByType(@Query() query: QueryPropertiesByTypePayload): Promise<IFindAllPropertiesResponse> {
    return await this.service.findAll(query, {state: query.state});
  }

  @Get('search/address')
  async findByAddress(@Query() query: QueryPropertiesByAddressPayload): Promise<IFindAllPropertiesResponse> {
    const regexStr = new RegExp(query.address?.toString()?.trim(), 'i');
    return await this.service.findAll(query, {address: regexStr});
  }

  @Patch(':id')
  async updateById(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Body() data: PatchPropertyPayload,
  ): Promise<IProperty> {
    return await this.service.updateById(id, data);
  }

  @Post(':id/upload/audio')
  @ApiConsumes('multipart/form-data')
  @ApiAudioFile()
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadAudio(
    @Param('id', ObjectIdValidationPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IProperty> {
    return await this.service.uploadAudioFile(id, file);
  }

  @Post(':id/upload/video')
  @ApiConsumes('multipart/form-data')
  @ApiVideoFile()
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadVideo(
    @Param('id', ObjectIdValidationPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IProperty> {
    return await this.service.uploadVideoFile(id, file);
  }

  @Post(':id/upload/document')
  @ApiConsumes('multipart/form-data')
  @ApiDocFile()
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadDocument(
    @Param('id', ObjectIdValidationPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<IProperty> {
    return await this.service.uploadDocFile(id, file);
  }

  @Post(':id/upload/image')
  @ApiConsumes('multipart/form-data')
  @ApiImageFile()
  @UseInterceptors(FileExtender)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadImage(
    @Param('id', ObjectIdValidationPipe) id: string,
    @UploadedFile() file: IAppFile,
  ): Promise<IProperty> {
    return await this.service.uploadImageFile(id, file);
  }

  @Post(':id/upload/images')
  @ApiConsumes('multipart/form-data')
  @ApiMultiFile()
  @UseInterceptors(FileFieldsInterceptor([{name: 'files', maxCount: 4}], multerOptions))
  async uploadImages(
    @Param('id', ObjectIdValidationPipe) id: string,
    @UploadedFiles() data: Express.Multer.File[],
  ): Promise<IProperty> {
    return await this.service.uploadImages(id, data);
  }

  @Post(':id/upload/images360')
  @ApiConsumes('multipart/form-data')
  @ApiMultiFile()
  @UseInterceptors(FileFieldsInterceptor([{name: 'files', maxCount: 4}], multerOptions))
  async uploadImages360(
    @Param('id', ObjectIdValidationPipe) id: string,
    @UploadedFiles() data: Express.Multer.File[],
  ): Promise<IProperty> {
    return await this.service.upload360Images(id, data);
  }

  @Post('create')
  @ApiCreatedResponse({description: 'The property has been successfully created.'})
  async create(@AuthUser() user: UserDocument, @Body() data: CreatePropertyPayload): Promise<IProperty> {
    return await this.service.create(user, data);
  }

  @Put(':id/status/update')
  async updateStatus(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query() query: UpdatePropertyStatusPayload,
  ): Promise<IProperty> {
    return await this.service.updateStatus(id, query.status);
  }

  @Put(':id/details/update')
  async updateAdditionalDetails(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query() query: UpdateAdditionalDetailsStatusPayload,
  ): Promise<IProperty> {
    return await this.service.updateAdditionalDetails(id, query.additionalDetails);
  }

  @Put(':id/rate')
  async rate(@Param('id', ObjectIdValidationPipe) id: string): Promise<IProperty> {
    return await this.service.rate(id);
  }

  @Delete(':id')
  async remove(@Param('id', ObjectIdValidationPipe) id: string) {
    return await this.service.deleteById(id);
  }

  @Delete(':id/delete/audio')
  async deleteAudioFile(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query('fileId', ObjectIdValidationPipe) fileId: string,
  ): Promise<void> {
    await this.service.deleteAudioFile(id, fileId);
  }

  @Delete(':id/video')
  async deleteVideoFile(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query('fileId', ObjectIdValidationPipe) fileId: string,
  ): Promise<void> {
    await this.service.deleteVideoFile(id, fileId);
  }

  @Delete(':id/document')
  async deleteAgreementFile(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query('fileId', ObjectIdValidationPipe) fileId: string,
    @Query() query: DeleteDocPayload,
  ): Promise<void> {
    await this.service.deleteDocFile(id, fileId, query.type);
  }

  @Delete(':id/image')
  async deleteImageFile(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query('fileId', ObjectIdValidationPipe) fileId: string,
    @Query() query: DeleteImagePayload,
  ): Promise<void> {
    await this.service.deleteImageFile(id, fileId, query.type);
  }

  @Delete(':id/images')
  async deletePropertyImages(
    @Param('id', ObjectIdValidationPipe) id: string,
    @Query() query: DeleteImagePayload,
  ): Promise<void> {
    await this.service.deletePropertyImages(id, query);
  }
}
