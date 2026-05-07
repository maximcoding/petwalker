import { Connection } from 'mongoose';
import { ModelEnum } from '../../enums/model.enum';
import { DATABASE_PROVIDER } from '../database/database.providers';
import { RecentSchema } from './recent.schema';

export const RECENT_PROVIDER = 'RECENT_PROVIDER';

export const recentProviders = [
  {
    provide: RECENT_PROVIDER,
    useFactory: (connection: Connection) =>
      connection.model(ModelEnum.Recent, RecentSchema),
    inject: [DATABASE_PROVIDER],
  },
];
