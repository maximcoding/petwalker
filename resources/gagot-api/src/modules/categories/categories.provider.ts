import {Connection} from 'mongoose';
import {ModelEnum} from '../../enums/model.enum';
import {DATABASE_PROVIDER} from '../database/database.providers';
import {CategorySchema} from './category.schema';

export const categoriesProviders = [
  {
    provide: ModelEnum.Categories,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Categories, CategorySchema),
    inject: [DATABASE_PROVIDER],
  },
];
