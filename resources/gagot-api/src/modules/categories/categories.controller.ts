import {Body, Controller, Get, Param, Post} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {CategoriesService} from './catagories.service';
import {ICategory} from './category.schema';
import {CategoriesPayload, CategoryPayload} from './payload/category.payload';
import {ApiTags} from '@nestjs/swagger';
import {CategoryEnum} from '../../enums/categoryEnum';

@ApiTags('House Categories')
@Controller(ModelEnum.Categories)
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get()
  async findAll(): Promise<ICategory[]> {
    // return categoriesDataArray as ICategory[];
    return await this.service.findAll();
  }

  @Get(':name')
  async getCategory(@Param() name: CategoryEnum): Promise<ICategory> {
    return await this.service.findOne(name);
  }

  @Post()
  async create(@Body() payload: CategoryPayload): Promise<ICategory> {
    return await this.service.create(payload);
  }
}
