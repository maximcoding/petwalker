import * as mongoose from 'mongoose';
import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose';
import {Document, model, Model} from 'mongoose';
import {IUser} from '../users/interfaces/user.interface';
import {IProperty, Property} from '../properties/propertySchema';
import {CommonSchemaOptions} from '../../helpers/common-schema.options';
import {ModelEnum} from '../../enums/model.enum';
import {User} from '../users/schemas/user.schema';

export interface IReview {
  author?: IUser;
  property?: IProperty;
  content?: string;
  replies?: string[];
  rating?: number;
}

export type ReviewDocument = IReview & Document;

@Schema(CommonSchemaOptions)
export class Review implements IReview {
  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Users})
  author: User;

  @Prop({type: mongoose.Schema.Types.ObjectId, ref: ModelEnum.Properties})
  property: Property;

  @Prop()
  content: string;

  @Prop([String])
  replies: string[];

  @Prop()
  rating: number;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
export type IReviewModel = Model<ReviewDocument>;

export const ReviewModel: IReviewModel = model<ReviewDocument, IReviewModel>(ModelEnum.Reviews, ReviewSchema);
