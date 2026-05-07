import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsBooleanString,
  IsCurrency,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {SortBy} from '../properties.service';
import {PropertyState} from '../../../enums/propertyState';
import {CategoryEnum} from '../../../enums/categoryEnum';
import {PropertyStatus} from '../propertySchema';
import {ApiProperty} from '@nestjs/swagger';
import {AppFileEnum} from '../../files/aws-file.schema';
import faker from 'faker';
import {currencyOptions} from './create-property.payload';

export enum PropertyPreview {
  false,
  true,
}

export class QueryPropertiesPayload {
  @ApiProperty({
    description: 'pagination',
    default: 1,
    required: false,
  })
  @IsOptional()
  @IsNotEmpty()
  page: number;

  @ApiProperty({
    description: 'pagination',
    default: 20,
    required: false,
  })
  @IsOptional()
  limit: number;

  @ApiProperty({
    description: 'any SortBy value',
    enum: SortBy,
    default: SortBy.new,
    enumName: 'SortBy',
  })
  @IsOptional()
  sort: SortBy;

  @ApiProperty({
    description: 'partial data',
    default: PropertyPreview.true,
    enumName: 'PropertyPreview',
    enum: PropertyPreview,
  })
  @IsOptional()
  preview: boolean;
}

export class QueryPropertiesByTypePayload extends QueryPropertiesPayload {
  @ApiProperty({
    description: 'any PropertyState values',
    required: true,
    enum: PropertyState,
    enumName: 'PropertyState',
    default: PropertyState.Renting,
  })
  @IsEnum(PropertyState)
  @IsNotEmpty()
  state: PropertyState;
}

export class QueryPropertiesByCategoryPayload extends QueryPropertiesPayload {
  @ApiProperty({
    description: 'category name mandatory',
    enum: CategoryEnum,
    enumName: 'CategoryEnum',
    default: CategoryEnum.Apartments,
    required: true,
  })
  @IsEnum(CategoryEnum)
  @IsString()
  @IsNotEmpty()
  categoryName: CategoryEnum;
}

export class UpdatePropertyStatusPayload {
  @ApiProperty({
    description: 'PropertyStatus value',
    enum: PropertyStatus,
    enumName: 'PropertyStatus',
    isArray: false,
    required: true,
  })
  @IsEnum(PropertyStatus)
  status: PropertyStatus;
}

export class UpdateAdditionalDetailsStatusPayload {
  @ApiProperty({
    description: 'any boolean value',
  })
  @IsNotEmpty()
  @IsBooleanString()
  additionalDetails: boolean;
}

export class QueryPropertiesByAddressPayload extends QueryPropertiesPayload {
  @ApiProperty({
    description: 'search by city',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  address: string;
}

export class QueryPropertiesByTextPayload extends QueryPropertiesPayload {
  @ApiProperty({
    description: 'search by free text',
    required: false,
    type: String,
  })
  @MinLength(2)
  @IsOptional()
  @IsString()
  freeText: string;
}

export interface IFindAllPropertiesResponse {
  properties: any[];
  total: number;
  page?: number;
  last_page?: number;
}

export class DeleteImagePayload {
  @ApiProperty({
    description: 'file type mandatory',
    enum: [AppFileEnum.images, AppFileEnum.images360],
    default: AppFileEnum.images,
    required: true,
  })
  @IsEnum(AppFileEnum)
  @IsNotEmpty()
  type: AppFileEnum;
}

export class DeleteDocPayload {
  @ApiProperty({
    description: 'file type mandatory',
    enum: [AppFileEnum.agreement, AppFileEnum.cancellation, AppFileEnum.rules],
    default: AppFileEnum.agreement,
    required: true,
  })
  @IsEnum(AppFileEnum)
  @IsNotEmpty()
  type: AppFileEnum;
}
