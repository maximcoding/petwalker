import * as mongoose from 'mongoose';

import {ModelEnum} from '../../enums/model.enum';
import {NextToEnum} from '../../enums/nexto.num';
import {CommonAmenitiesEnum, SafetyAmenitiesEnum} from '../../enums/amenities.enum';
import {PropertyState} from '../../enums/propertyState';
import {FacilitiesEnum} from '../../enums/facilities.enum';
import {Document, Model, model, ObjectId} from 'mongoose';
import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {CommonSchemaOptions} from '../../helpers/common-schema.options';
import {User} from '../users/schemas/user.schema';
import {Factory} from 'nestjs-seeder';
import {Visit} from '../visits/visit.schema';
import {Room} from '../rooms/room.schema';
import {AwsFile, IAwsFile} from '../files/aws-file.schema';
import {CategoryEnum} from '../../enums/categoryEnum';
import {MeasurementEnum} from '../../enums/measurement.enum';
import {KitchenEnum} from '../../enums/kitchen.enum';

const date = new Date();
const thisYear = date.getFullYear();

export enum PropertyStatus {
  draft = 'draft',
  opened = 'opened',
  approved = 'approved',
  closed = 'closed',
  deleted = 'deleted',
}

export enum CurrencyEnum {
  nis = 'nis',
  dollar = 'dollar',
  euro = 'euro',
}

export interface IPropertyPreview {
  _id?: string;
  address: string;
  coordinate: number[];
  square: number;
  squareUnits: MeasurementEnum;
  status?: PropertyStatus;
  title: string;
  state: PropertyState[];
  floors: number;
  price: any;
  currency: CurrencyEnum;
  deposit: number;
  categoryName?: CategoryEnum;
  rooms?: Room[]; // foreign key
  files?: IAwsFile[];
}

export interface IProperty extends IPropertyPreview {
  state: PropertyState[];
  newConstruction: boolean;
  yearBuild: number;
  description: string;
  nextTo: NextToEnum[];
  onTheLand: boolean;
  lastFloor: boolean;
  elevator: boolean;
  kitchen: KitchenEnum[];
  amenities: CommonAmenitiesEnum[];
  facilities: FacilitiesEnum[];
  safetyAmenities: SafetyAmenitiesEnum[];
  additionalDetails: boolean; // in case use selected
  rating?: number;
  owner?: User; // foreign key
  visits?: Visit[];
  images360?: IAwsFile[];
  images?: IAwsFile[];
  cancellation?: IAwsFile;
  agreement?: IAwsFile;
  rules?: IAwsFile;
  video?: IAwsFile;
  videoUrl?: string;
  audio?: IAwsFile;
}

export type PropertyDocument = IProperty & Document;
export type PropertyPreviewDocument = IPropertyPreview & Document;

@Schema(CommonSchemaOptions)
export class Property implements IProperty {
  @Factory((faker) => faker.random.arrayElement(Object.values(PropertyState)))
  @Prop({
    type: [String],
    enum: Object.values(PropertyState),
    required: [true, 'PROPERTY_STATE_IS_BLANK'],
  })
  state: PropertyState[];

  @Factory((faker) => faker.address.streetAddress() + ',' + faker.address.city())
  @Prop({type: String})
  address: string;

  @Factory((faker) => [faker.address.latitude(), faker.address.longitude()])
  @Prop({
    type: [Number],
    default: [0, 0],
    required: true,
  })
  coordinate: number[];

  @Factory((faker) => faker.helpers.randomize([120, 94, 78, 150, 80, 95]))
  @Prop({
    type: Number,
    default: '',
    required: true,
  })
  square: number;

  @Prop({
    type: String,
    required: true,
    default: MeasurementEnum.meter,
    enum: Object.values(MeasurementEnum),
  })
  squareUnits: MeasurementEnum;

  @Prop({
    type: Boolean,
    default: false,
  })
  newConstruction: boolean;

  @Factory(() => {
    const minAge = 1920;
    const maxAge = 2021;
    return Math.round(Math.random() * (maxAge - minAge) + minAge);
  })
  @Prop({
    type: Number,
    min: 1920,
    default: 1921,
    max: thisYear + 5,
  })
  yearBuild: number;

  @Factory((faker) => faker.lorem.words())
  @Prop({type: String})
  description: string;

  @Factory((faker) => faker.random.arrayElement(Object.values(NextToEnum)))
  @Prop({
    type: [String],
    enum: Object.values(NextToEnum),
  })
  nextTo: NextToEnum[];

  @Factory((faker) => faker.random.boolean())
  @Prop({
    type: Boolean,
    default: false,
  })
  onTheLand: boolean;

  @Factory((faker) => faker.random.boolean())
  @Prop({
    type: Boolean,
    default: false,
  })
  lastFloor: boolean;

  @Factory((faker) => faker.random.boolean())
  @Prop({
    type: Boolean,
    default: false,
  })
  elevator: boolean;

  @Factory((faker) => faker.random.arrayElement(Object.values(KitchenEnum)))
  @Prop({
    type: [String],
    enum: Object.values(KitchenEnum),
  })
  kitchen: KitchenEnum[];

  @Factory((faker) => faker.random.arrayElement(Object.values(FacilitiesEnum)))
  @Prop({
    type: [String],
    enum: Object.values(FacilitiesEnum),
  })
  facilities: FacilitiesEnum[];

  @Factory((faker) => faker.random.arrayElement(Object.values(CommonAmenitiesEnum)))
  @Prop({
    type: [String],
    enum: Object.values(CommonAmenitiesEnum),
  })
  amenities: CommonAmenitiesEnum[];

  @Factory((faker) => faker.random.arrayElement(Object.values(SafetyAmenitiesEnum)))
  @Prop({
    type: [String],
    enum: Object.values(SafetyAmenitiesEnum),
  })
  safetyAmenities: SafetyAmenitiesEnum[];

  @Factory((faker) => faker.random.arrayElement(Object.values(PropertyStatus)))
  @Prop({
    type: String,
    enum: PropertyStatus,
    default: PropertyStatus.draft,
  })
  status: PropertyStatus;

  @Factory((faker) => faker.random.boolean())
  @Prop({
    type: Boolean,
    default: true,
  })
  additionalDetails: boolean;

  @Prop({
    type: String,
  })
  title: string;

  @Factory(() => {
    const min = 0;
    const max = 20;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({type: Number})
  floors: number;

  @Factory(() => {
    const min = 1000;
    const max = 20000000;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({
    type: Number,
  })
  price: number;

  @Prop({
    type: String,
    required: true,
    default: CurrencyEnum.nis,
    enum: Object.values(CurrencyEnum),
  })
  currency: CurrencyEnum;

  @Prop({type: Number})
  deposit: number;

  @Factory(() => {
    const min = 0;
    const max = 10;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({
    type: Number,
  })
  rating: number;

  @Factory(() => {
    const min = 1;
    const max = 5;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({
    default: 0,
    type: Number,
  })
  bedrooms: number;

  @Factory(() => {
    const min = 1;
    const max = 3;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({
    default: 0,
    type: Number,
  })
  bathrooms: number;

  @Factory(() => {
    const min = 0;
    const max = 2;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({
    default: 0,
    type: Number,
  })
  balconies: number;

  @Factory(() => {
    const min = 0;
    const max = 2;
    return Math.round(Math.random() * (min - max) + min);
  })
  @Prop({
    default: 0,
    type: Number,
  })
  parkingLots: number;

  @Factory((faker) => faker.random.arrayElement(Object.values(CategoryEnum)))
  @Prop({
    type: String,
    required: true,
    enum: Object.values(CategoryEnum),
  })
  categoryName: CategoryEnum;

  @Prop({
    type: Date,
  })
  entryDate: Date;

  @Factory((faker) => faker.random.arrayElement(Object.values(User)))
  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Users})
  owner: User;

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Rooms}]})
  rooms: Room[];

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Visits}]})
  visits: Visit[];

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files}]})
  images360: AwsFile[];

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files}]})
  images: AwsFile[];

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files})
  cancellation: AwsFile;

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files})
  agreement: AwsFile;

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files})
  rules: AwsFile;

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files})
  video: AwsFile;

  @Prop({type: String})
  videoUrl?: string;

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files})
  audio: AwsFile;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({'$**': 'text'});

export type IPropertyModel = Model<PropertyDocument>;

export const PropertyModel: IPropertyModel = model<PropertyDocument, IPropertyModel>(
  ModelEnum.Properties,
  PropertySchema,
);

PropertySchema.post('save', function (doc, next) {
  next();
  // throw new Error('something went wrong');
});

PropertySchema.post('remove', async function (doc: PropertyDocument) {
  // await RoomModel.remove({property: doc._id}).exec();
  // remove images
  // remove images360
  // remove visits
  // remove video
  // remove audio
  // remove agreement
  // remove cancellation
  // remove rooms
});
