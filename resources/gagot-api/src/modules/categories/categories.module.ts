import {Module} from '@nestjs/common';
import {CategoriesService} from './catagories.service';
import {CategoriesController} from './categories.controller';
import {DatabaseModule} from '../database';
import {categoriesProviders} from './categories.provider';

@Module({
  imports: [DatabaseModule],
  providers: [CategoriesService, ...categoriesProviders],
  exports: [CategoriesService],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
