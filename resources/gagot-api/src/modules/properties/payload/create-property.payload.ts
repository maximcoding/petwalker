import {CurrencyEnum, IProperty, PropertyStatus} from '../propertySchema';
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
import * as faker from 'faker';
import {CategoryEnum} from '../../../enums/categoryEnum';
import {MeasurementEnum} from '../../../enums/measurement.enum';
import {KitchenEnum} from 'src/enums/kitchen.enum';
import {IAwsFile} from 'src/modules/files/aws-file.schema';
import {Room} from 'src/modules/rooms/room.schema';
import {User} from 'src/modules/users/schemas/user.schema';
import {Visit} from 'src/modules/visits/visit.schema';

export const currencyOptions = {
  require_symbol: false,
  allow_space_after_symbol: false,
  symbol_after_digits: false,
  allow_negatives: false,
  parens_for_negatives: false,
  negative_sign_before_digits: false,
  negative_sign_after_digits: false,
  allow_negative_sign_placeholder: false,
  thousands_separator: '.',
  decimal_separator: '.',
  allow_decimal: true,
  require_decimal: false,
  digits_after_decimal: [2],
  allow_space_after_digits: false,
};

export class CreatePropertyPayload {
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

  @ApiProperty({
    description: 'PropertyState values',
    enum: PropertyState,
    enumName: 'PropertyState',
    isArray: true,
    required: true,
  })
  @IsNotEmpty()
  @ArrayUnique()
  @IsEnum(PropertyState, {each: true})
  state: PropertyState[];

  @ApiProperty({
    description: 'PropertyStatus value',
    enum: PropertyStatus,
    enumName: 'PropertyStatus',
    isArray: false,
    required: true,
  })
  @IsEnum(PropertyStatus)
  status: PropertyStatus;

  @ApiProperty({
    description: 'price with format 9999.999.99',
    type: String,
    default: 0.0,
  })
  @IsNumber()
  @IsNotEmpty()
  price: number;

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

  @ApiProperty({type: Number})
  @IsNumber()
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

  @ApiProperty({
    description: 'deposit in %',
    default: 30,
    required: true,
  })
  @ApiProperty({type: Number})
  deposit: number;

  @ApiProperty({
    description: 'full address',
    default: faker.address.city() + ', ' + faker.address.streetAddress(),
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  address: string;

  @ApiProperty({type: [Number]})
  @IsArray()
  coordinate: number[];

  @ApiProperty({description: 'date'})
  @IsDateString()
  entryDate: Date;

  @ApiProperty({description: faker.lorem.words(), default: faker.lorem.words(), required: false, type: String})
  title: string;

  @ApiProperty({description: faker.lorem.words(), default: faker.lorem.words(), required: false, type: String})
  @MinLength(2)
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({type: Boolean})
  @IsOptional()
  @IsBoolean()
  elevator: boolean;

  @ApiProperty({type: Number})
  @IsNumber()
  floors: number;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  kitchenBarTable: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  kitchenDualSinks: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  kitchenGas: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  lastFloor: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  newConstruction: boolean;

  @ApiProperty({type: Boolean})
  @IsBoolean()
  onTheLand: boolean;

  @ApiProperty({
    description: 'year between 1921 - to future',
    isArray: false,
    minimum: 1920,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  yearBuild: number;

  @ApiProperty({
    description: 'Bathrooms count',
    type: Number,
    minimum: 0,
    maximum: 5,
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
  })
  @Min(0)
  @Max(20)
  @IsNumber()
  bedrooms: number;

  @ApiProperty({
    description: 'Kitchen count',
    type: Number,
  })
  @IsNumber()
  kitchens: number;

  @ApiProperty({
    description: 'Balconies count',
    type: Number,
  })
  @IsNumber()
  balconies: number;

  @ApiProperty({
    description: 'Parking lots',
    type: Number,
  })
  @IsNumber()
  parkingLots: number;

  @ApiProperty({
    description: 'in case user approved modal "to provide additional room details"',
    default: false,
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  additionalDetails: boolean;

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
