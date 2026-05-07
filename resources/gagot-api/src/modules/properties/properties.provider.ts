import {Connection} from 'mongoose';
import {ModelEnum} from '../../enums/model.enum';
import {PropertySchema} from './propertySchema';
import {DATABASE_PROVIDER} from '../database/database.providers';
import {RoomSchema} from '../rooms/room.schema';
import {VisitSchema} from '../visits/visit.schema';

export const propertiesProviders = [
  {
    provide: ModelEnum.Visits,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Visits, VisitSchema),
    inject: [DATABASE_PROVIDER],
  },
  {
    provide: ModelEnum.Rooms,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Rooms, RoomSchema),
    inject: [DATABASE_PROVIDER],
  },
  {
    provide: ModelEnum.Properties,
    useFactory: (connection: Connection) => connection.model(ModelEnum.Properties, PropertySchema),
    inject: [DATABASE_PROVIDER],
  },
];
