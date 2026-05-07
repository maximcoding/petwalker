import * as mongoose from 'mongoose';
import {ModelEnum} from '../../enums/model.enum';

export const RecentSchema = new mongoose.Schema(
  {
    propertyID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelEnum.Properties,
    },
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: ModelEnum.Users,
    },
  },
  {timestamps: true},
);
