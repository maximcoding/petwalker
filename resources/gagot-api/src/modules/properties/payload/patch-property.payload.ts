import {CurrencyEnum, IProperty} from '../propertySchema';
import {NextToEnum} from '../../../enums/nexto.num';
import {CommonAmenitiesEnum, SafetyAmenitiesEnum} from '../../../enums/amenities.enum';
import {PropertyState} from '../../../enums/propertyState';
import {FacilitiesEnum} from '../../../enums/facilities.enum';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsCurrency,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {Visit} from '../../visits/visit.schema';
import {CategoryEnum} from '../../../enums/categoryEnum';
import {currencyOptions} from './create-property.payload';
import {MeasurementEnum} from '../../../enums/measurement.enum';
import {KitchenEnum} from '../../../enums/kitchen.enum';

export class PatchPropertyPayload implements IProperty {
  @ApiProperty({
    description: 'in case user approved modal "to provide additional room details"',
    default: false,
    type: Boolean,
  })
  @IsOptional()
  additionalDetails: boolean;

  @ApiProperty({
    description: 'some address',
    default: '',
    type: String,
  })
  @IsString()
  address: string;

  @ApiProperty({type: [Number]})
  @IsArray()
  coordinate: number[];

  @ApiProperty({type: Number})
  deposit: number;

  @ApiProperty({description: 'free text', type: String})
  @MinLength(2)
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({type: Boolean})
  @IsOptional()
  @IsBoolean()
  elevator: boolean;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 500,
  })
  @IsNumber()
  floors: number;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  lastFloor: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  newConstruction: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  onTheLand: boolean;

  @ApiProperty({description: 'date'})
  @IsDateString()
  entryDate: Date;

  @ApiProperty({
    description: 'price with format 9999.999.99',
    type: String,
    default: '0.00',
  })
  @IsOptional()
  @IsCurrency(currencyOptions)
  price: string;

  @ApiProperty({
    description: 'CurrencyEnum value',
    enum: CurrencyEnum,
    enumName: 'CurrencyEnum',
    default: CurrencyEnum.nis,
    isArray: false,
    required: true,
  })
  @IsEnum(CurrencyEnum)
  currency: CurrencyEnum;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: 100000,
  })
  @IsNumber()
  @Min(0)
  @Max(10000)
  @IsOptional()
  square: number;

  @ApiProperty({
    description: 'MeasurementEnum value',
    enum: MeasurementEnum,
    enumName: 'MeasurementEnum',
    default: MeasurementEnum.meter,
    required: true,
  })
  @IsEnum(MeasurementEnum)
  squareUnits: MeasurementEnum;

  @ApiProperty({type: String})
  @IsOptional()
  title: string;

  @ApiProperty({
    description: 'PropertyState values',
    enum: PropertyState,
    enumName: 'PropertyState',
    isArray: true,
  })
  @IsNotEmpty()
  @ArrayUnique()
  @IsEnum(PropertyState, {each: true})
  state: PropertyState[];

  @ApiProperty({type: Number})
  @IsOptional()
  yearBuild: number;

  @ApiProperty({
    description: 'category mandatory',
    enum: CategoryEnum,
    enumName: 'CategoryEnum',
    default: CategoryEnum.Apartments,
  })
  @IsOptional()
  @IsEnum(CategoryEnum)
  @IsString()
  @IsNotEmpty()
  categoryName: CategoryEnum;

  @IsArray()
  @IsOptional()
  visits?: Visit[];

  @ApiProperty({
    description: 'values',
    required: true,
    enum: NextToEnum,
    enumName: 'NextToEnum',
    isArray: true,
  })
  @ArrayUnique()
  @IsEnum(NextToEnum, {each: true})
  @IsNotEmpty()
  nextTo: NextToEnum[];

  @ApiProperty({
    description: 'kitchen amenities list',
    type: [String],
    required: true,
    isArray: true,
    enum: KitchenEnum,
    enumName: 'KitchenEnum',
  })
  @IsNotEmpty()
  @ArrayUnique()
  @IsEnum(KitchenEnum, {each: true})
  kitchen: KitchenEnum[];

  @ApiProperty({
    description: 'common amenities list',
    type: [String],
    required: true,
    isArray: true,
    enum: CommonAmenitiesEnum,
    enumName: 'CommonAmenitiesEnum',
  })
  @IsNotEmpty()
  @ArrayUnique()
  @IsEnum(CommonAmenitiesEnum, {each: true})
  amenities: CommonAmenitiesEnum[];

  @ApiProperty({
    description: 'facilities list',
    enum: FacilitiesEnum,
    enumName: 'FacilitiesEnum',
    isArray: true,
    type: [String],
  })
  @ArrayUnique()
  @IsEnum(FacilitiesEnum, {each: true})
  @IsOptional()
  facilities: FacilitiesEnum[];

  @ApiProperty({
    description: 'SafetyAmenitiesEnum values',
    enum: SafetyAmenitiesEnum,
    type: [String],
    enumName: 'SafetyAmenitiesEnum',
    isArray: true,
  })
  @ArrayUnique()
  @IsEnum(SafetyAmenitiesEnum, {each: true})
  @IsOptional()
  safetyAmenities: SafetyAmenitiesEnum[];
}
