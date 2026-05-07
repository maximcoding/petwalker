import * as mongoose from 'mongoose';
import {ModelEnum} from '../../enums/model.enum';
import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {CommonSchemaOptions} from '../../helpers/common-schema.options';
import {Document} from 'mongoose';
import {IProperty, Property, PropertyDocument} from '../properties/propertySchema';
import {User} from '../users/schemas/user.schema';
import {IUser} from '../users/interfaces/user.interface';

export enum DayOfTheWeekEnum {
  Sunday = 'Sun',
  Monday = 'Mon',
  Tuesday = 'Tue',
  Wednesday = 'Wed',
  Thursday = 'Thu',
  Friday = 'Fr',
  Saturday = 'Sat',
}

export interface IVisit {
  timeFrom?: string;
  timeTo?: string;
  date?: Date;
  day?: DayOfTheWeekEnum;
  property?: IProperty;
  visitors?: IUser[];
}

@Schema(CommonSchemaOptions)
export class Visit implements IVisit {
  @Prop({
    type: String,
    required: [true, 'VISIT_TIME_FROM_IS_BLANK'],
  })
  timeFrom: string;

  @Prop({
    type: String,
    required: [true, 'VISIT_TIME_TO_IS_BLANK'],
  })
  timeTo: string;

  @Prop({
    type: Date,
    required: [true, 'VISIT_DATE_IS_BLANK'],
  })
  date: Date;

  @Prop({
    type: String,
    enum: Object.values(DayOfTheWeekEnum),
    required: [true, 'VISIT_DAY_IS_BLANK'],
  })
  day: DayOfTheWeekEnum;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: ModelEnum.Properties,
    required: [true, 'VISIT_PROPERTY_IS_BLANK'],
  })
  property: Property;

  @Prop({type: [{type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Users}]})
  visitors: User[];
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
export type VisitDocument = Visit & Document;
