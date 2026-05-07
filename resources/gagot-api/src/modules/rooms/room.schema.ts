import * as mongoose from 'mongoose';
import {RoomEnum} from '../../enums/roomEnum';
import {ModelEnum} from '../../enums/model.enum';
import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {CommonSchemaOptions} from '../../helpers/common-schema.options';
import {Document, Model, model} from 'mongoose';
import {AwsFile} from '../files/aws-file.schema';
import {BathEnum} from '../../enums/bath.enum';
import {Property, PropertyDocument} from '../properties/propertySchema';

export interface IRoom {
  type: RoomEnum;
  order: number;
  bath: BathEnum[];
  property?: Property;
  images360?: AwsFile[];
  images?: AwsFile[];
}

export type RoomDocument = Room & Document;

@Schema(CommonSchemaOptions)
export class Room implements IRoom {
  @Prop({
    type: String,
    enum: RoomEnum,
    required: [true, 'ROOM_TYPE_IS_BLANK'],
  })
  type: RoomEnum;

  @Prop({
    type: Number,
    required: [true, 'ROOM_ORDER_IS_BLANK'],
  })
  order: number;

  @Prop({
    type: [String],
    enum: Object.values(BathEnum),
  })
  bath: BathEnum[];

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Properties})
  property: Property;

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files}]})
  images360: AwsFile[];

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Files}]})
  images: AwsFile[];
}

export const RoomSchema = SchemaFactory.createForClass(Room);

export type IRoomModel = Model<RoomDocument>;

export const RoomModel = model(ModelEnum.Rooms, RoomSchema);

RoomSchema.post('save', function (doc, next) {
  next();
});

// Will not execute until the first middleware calls `next()`
RoomSchema.post('save', function (doc, next) {
  next();
});

RoomSchema.pre('remove', async (doc) => {
  // remove also images , images360
  // throw new Error('something went wrong');
  // remove images
  // remove images360
  // remove visits
  // remove video
  // remove audio
  // remove agreement
  // remove cancellation
  // remove rooms
});
