import {Connection} from 'mongoose';
import {ModelEnum} from '../../enums/model.enum';
import {DATABASE_PROVIDER} from '../database/database.providers';
import {UserSchema} from './schemas/user.schema';
import {ComplainSchema} from './schemas/complain.schema';
import {ReviewSchema} from '../reviews/review.schema';

export const usersProviders = [
  {
    provide: ModelEnum.Reviews,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Reviews, ReviewSchema),
    inject: [DATABASE_PROVIDER],
  },
  {
    provide: ModelEnum.Complains,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Complains, ComplainSchema),
    inject: [DATABASE_PROVIDER],
  },
  {
    provide: ModelEnum.Users,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Users, UserSchema),
    inject: [DATABASE_PROVIDER],
  },
];
