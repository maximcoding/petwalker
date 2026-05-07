import {forwardRef, Module} from '@nestjs/common';
import {PropertiesService} from './properties.service';
import {PropertiesController} from './properties.controller';
import {DatabaseModule} from '../database';
import {propertiesProviders} from './properties.provider';
import {CategoriesModule} from '../categories/categories.module';
import {FilesModule} from '../files/files.module';
import {RoomsController} from '../rooms/rooms.controller';
import {RoomsService} from '../rooms/rooms.service';
import {VisitsService} from '../visits/visits.service';
import {VisitsController} from '../visits/visits.controller';
import {UserModule} from '../users/user.module';
import {SeederModule} from 'nestjs-seeder/dist/seeder/seeder.module';

@Module({
  imports: [DatabaseModule, CategoriesModule, FilesModule, UserModule],
  providers: [PropertiesService, RoomsService, VisitsService, ...propertiesProviders],
  exports: [PropertiesService, RoomsService, VisitsService],
  controllers: [PropertiesController, RoomsController, VisitsController],
})
export class PropertiesModule {}
