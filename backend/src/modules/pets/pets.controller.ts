import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { S3Service } from '../storage/s3.service.js';

import { PetsService } from './pets.service.js';

import {
  type CreatePetDto,
  CreatePetDto as CreatePetSchema,
  type ListPetsQuery,
  ListPetsQuery as ListPetsSchema,
  type RequestUploadUrlDto,
  RequestUploadUrlDto as RequestUploadUrlSchema,
  type UpdatePetDto,
  UpdatePetDto as UpdatePetSchema,
  type UploadUrlResponse,
} from '@petwalker/shared/dto';
import type { CursorPage, Pet } from '@petwalker/shared/types';

@Controller('pets')
@UseGuards(CognitoGuard)
export class PetsController {
  constructor(
    @Inject(PetsService) private readonly pets: PetsService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(S3Service) private readonly s3: S3Service,
  ) {}

  @Get()
  async list(
    @CurrentUser() ctx: { sub: string; email: string },
    @Query(new ZodValidationPipe(ListPetsSchema)) q: ListPetsQuery,
  ): Promise<CursorPage<Pet>> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.pets.listMine(me.id, q);
  }

  @Get(':id')
  async get(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Pet> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.pets.getOwned(me.id, id);
  }

  @Post()
  async create(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(CreatePetSchema)) dto: CreatePetDto,
  ): Promise<Pet> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.pets.create(me.id, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdatePetSchema)) dto: UpdatePetDto,
  ): Promise<Pet> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.pets.update(me.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.pets.delete(me.id, id);
  }

  /** Pre-signed S3 PUT URL for a pet photo. Client uploads bytes directly to S3. */
  @Post('photo-upload-url')
  async createPhotoUploadUrl(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(RequestUploadUrlSchema)) dto: RequestUploadUrlDto,
  ): Promise<UploadUrlResponse> {
    if (dto.kind !== 'pet-photo') {
      throw new ForbiddenException('This endpoint only mints pet-photo upload URLs');
    }
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.s3.createPutUrl({
      kind: dto.kind,
      userId: me.id,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
    });
  }
}
