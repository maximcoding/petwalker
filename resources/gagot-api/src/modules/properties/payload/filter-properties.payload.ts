import {ApiProperty} from '@nestjs/swagger';
import {CategoryEnum} from '../../../enums/categoryEnum';
import {
  ArrayUnique,
  IsBoolean,
  IsCurrency,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {PropertyState} from '../../../enums/propertyState';
import {currencyOptions} from './create-property.payload';
import {QueryPropertiesPayload} from './query-property.payload';
import {RoleEnum} from '../../../enums/role.enum';
import {NextToEnum} from '../../../enums/nexto.num';
import {CommonAmenitiesEnum, SafetyAmenitiesEnum} from '../../../enums/amenities.enum';
import {FacilitiesEnum} from '../../../enums/facilities.enum';
import {KitchenEnum} from '../../../enums/kitchen.enum';

export class FilterPropertiesPayload extends QueryPropertiesPayload {
  @ApiProperty({
    description: 'category name mandatory',
    enum: CategoryEnum,
    enumName: 'CategoryEnum',
    default: [CategoryEnum.Apartments],
    isArray: true,
    required: false,
  })
  @ArrayUnique()
  @IsEnum(CategoryEnum, {each: true})
  categoryName: CategoryEnum[];

  @ApiProperty({
    description: 'PropertyState values',
    enum: PropertyState,
    enumName: 'PropertyState',
    default: [PropertyState.Renting],
    isArray: true,
    required: false,
  })
  @ArrayUnique()
  @IsEnum(PropertyState, {each: true})
  state: PropertyState[];

  @ApiProperty({
    description: 'price with format 9999.999.99',
    type: Number,
    default: 0,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  priceMin: number;

  @ApiProperty({
    description: 'price with format 9999.999.99',
    type: Number,
    default: 2500000,
    required: true,
  })
  @IsNotEmpty()
  @IsNumber()
  priceMax: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 2000,
    default: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(2000)
  squareMin: number;

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: 2000,
    default: 2000,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(2000)
  squareMax: number;

  @ApiProperty({
    description: 'Bathrooms count',
    type: Number,
    minimum: 0,
    maximum: 5,
    required: false,
  })
  @Min(0)
  @Max(5)
  @IsNumber()
  bathrooms: number;

  @ApiProperty({
    description: 'Bedrooms count',
    type: Number,
    minimum: 0,
    maximum: 20,
    required: false,
  })
  @Min(0)
  @Max(20)
  @IsNumber()
  bedrooms: number;

  @ApiProperty({
    description: 'agent or private',
    enum: RoleEnum,
    enumName: 'RoleEnum',
    default: RoleEnum.Agent,
    required: false,
  })
  @IsEnum(RoleEnum)
  publishedBy: string;

  @ApiProperty({
    description: 'publish date',
    type: Date,
    required: false,
    default: new Date('2020').toISOString(),
  })
  @IsDateString()
  @IsOptional()
  publishedFromDate: Date;

  @ApiProperty({
    description: 'is new construction',
    type: Boolean,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  newConstruction: boolean;

  @ApiProperty({
    description: 'is property on the land',
    type: Boolean,
    default: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  onTheLand: boolean;

  @ApiProperty({
    type: Number,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(500)
  floors: number;

  @ApiProperty({description: 'date'})
  @IsDateString()
  entryDate: Date;

  @ApiProperty({
    description: 'values',
    required: false,
    enum: NextToEnum,
    enumName: 'NextToEnum',
    isArray: true,
  })
  @IsOptional()
  @ArrayUnique()
  @IsEnum(NextToEnum, {each: true})
  @IsNotEmpty()
  nextTo: NextToEnum[];

  @ApiProperty({
    description: 'includes kitchen amenities list',
    type: [String],
    required: false,
    isArray: true,
    enum: KitchenEnum,
    enumName: 'KitchenEnum',
  })
  @IsOptional()
  @IsNotEmpty()
  @ArrayUnique()
  @IsEnum(KitchenEnum, {each: true})
  kitchen: KitchenEnum[];

  @ApiProperty({
    description: 'includes common amenities list',
    type: [String],
    required: false,
    isArray: true,
    enum: CommonAmenitiesEnum,
    enumName: 'CommonAmenitiesEnum',
  })
  @IsOptional()
  @IsNotEmpty()
  @ArrayUnique()
  @IsEnum(CommonAmenitiesEnum, {each: true})
  amenities: CommonAmenitiesEnum[];

  @ApiProperty({
    description: 'includes facilities list',
    enum: FacilitiesEnum,
    enumName: 'FacilitiesEnum',
    isArray: true,
    required: false,
    type: [String],
  })
  @ArrayUnique()
  @IsEnum(FacilitiesEnum, {each: true})
  @IsOptional()
  facilities: FacilitiesEnum[];

  @ApiProperty({
    description: 'includes safe amenities values',
    enum: SafetyAmenitiesEnum,
    type: [String],
    required: false,
    enumName: 'SafetyAmenitiesEnum',
    isArray: true,
  })
  @ArrayUnique()
  @IsEnum(SafetyAmenitiesEnum, {each: true})
  @IsOptional()
  safetyAmenities: SafetyAmenitiesEnum[];
}
