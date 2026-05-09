import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { AuthService } from '../auth/auth.service.js';
import { CognitoGuard } from '../auth/cognito.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { UsersService } from './users.service.js';

import {
  CreateBlackoutSchema,
  type CreateBlackoutDto,
  type ReplaceAvailabilityDto,
  ReplaceAvailabilityDto as ReplaceAvailabilitySchema,
  type UpdateUserDto,
  UpdateUserDto as UpdateUserSchema,
  type UpsertServiceOfferingDto,
  UpsertServiceOfferingDto as UpsertServiceOfferingSchema,
  type UpsertServiceProviderProfileDto,
  UpsertServiceProviderProfileDto as UpsertServiceProviderProfileSchema,
} from '@petwalker/shared/dto';
import { type ServiceType, SERVICE_TYPES } from '@petwalker/shared/enums';
import type {
  AvailabilitySlot,
  ProviderBlackout,
  ServiceOffering,
  ServiceProviderProfile,
  User,
} from '@petwalker/shared/types';

function parseServiceType(raw: string): ServiceType {
  if ((SERVICE_TYPES as readonly string[]).includes(raw)) return raw as ServiceType;
  throw new BadRequestException(
    `Unknown serviceType "${raw}". Allowed: ${SERVICE_TYPES.join(', ')}.`,
  );
}

@Controller('users')
@UseGuards(CognitoGuard)
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  @Patch('me')
  async updateMe(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ): Promise<User> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.updateMe(me.id, dto);
  }

  // ---- service-provider profile ---------------------------------------

  @Get('me/service-profile')
  async getMyServiceProfile(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<ServiceProviderProfile | null> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.getServiceProfile(me.id);
  }

  @Put('me/service-profile')
  async putMyServiceProfile(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(UpsertServiceProviderProfileSchema))
    dto: UpsertServiceProviderProfileDto,
  ): Promise<ServiceProviderProfile> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.upsertServiceProfile(me.id, dto);
  }

  // ---- per-service offerings ------------------------------------------

  @Get('me/offerings')
  async listMyOfferings(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<ServiceOffering[]> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.listMyOfferings(me.id);
  }

  /** Path param matches the body's `serviceType` and is the canonical id. */
  @Put('me/offerings/:serviceType')
  async putOffering(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('serviceType') _serviceType: string,
    @Body(new ZodValidationPipe(UpsertServiceOfferingSchema)) dto: UpsertServiceOfferingDto,
  ): Promise<ServiceOffering> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.upsertOffering(me.id, dto);
  }

  @Delete('me/offerings/:serviceType')
  @HttpCode(204)
  async removeOffering(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('serviceType') serviceType: string,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.users.removeOffering(me.id, parseServiceType(serviceType));
  }

  /**
   * Manual slot publication for slot-mode offerings. Idempotent — safe to
   * trigger from a "Publish slots now" button without worrying about
   * duplicates. Returns the count of new slots actually inserted.
   */
  @Post('me/offerings/:serviceType/publish-slots')
  async publishSlots(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('serviceType') serviceType: string,
  ): Promise<{ inserted: number }> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    const inserted = await this.users.publishSlots(me.id, parseServiceType(serviceType));
    return { inserted };
  }

  // ---- weekly availability ---------------------------------------------

  @Get('me/availability')
  async getAvailability(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<AvailabilitySlot[]> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.getAvailability(me.id);
  }

  @Put('me/availability')
  async replaceAvailability(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(ReplaceAvailabilitySchema)) dto: ReplaceAvailabilityDto,
  ): Promise<AvailabilitySlot[]> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.replaceAvailability(me.id, dto);
  }

  // ---- blackouts -------------------------------------------------------

  @Get('me/blackouts')
  async listBlackouts(
    @CurrentUser() ctx: { sub: string; email: string },
  ): Promise<ProviderBlackout[]> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.listBlackouts(me.id);
  }

  @Post('me/blackouts')
  async createBlackout(
    @CurrentUser() ctx: { sub: string; email: string },
    @Body(new ZodValidationPipe(CreateBlackoutSchema)) dto: CreateBlackoutDto,
  ): Promise<ProviderBlackout> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    return this.users.createBlackout(me.id, dto);
  }

  @Delete('me/blackouts/:id')
  @HttpCode(204)
  async deleteBlackout(
    @CurrentUser() ctx: { sub: string; email: string },
    @Param('id') id: string,
  ): Promise<void> {
    const me = await this.auth.upsertUser(ctx.sub, ctx.email);
    await this.users.deleteBlackout(me.id, id);
  }
}
