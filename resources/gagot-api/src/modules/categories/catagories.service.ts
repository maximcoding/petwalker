import {Model} from 'mongoose';
import {Injectable, Inject, Param} from '@nestjs/common';
import {CategoryDocument, ICategory} from './category.schema';
import {CategoryEnum} from '../../enums/categoryEnum';
import {ModelEnum} from '../../enums/model.enum';
import {CategoriesPayload} from './payload/category.payload';

@Injectable()
export class CategoriesService {
  constructor(@Inject(ModelEnum.Categories) private dataModel: Model<CategoryDocument>) {}

  async findAll(): Promise<ICategory[]> {
    return this.dataModel.find().exec();
  }

  async findOne(name: CategoryEnum) {
    return this.dataModel.findOne({name}).exec();
  }

  async create(data: ICategory): Promise<ICategory> {
    const newData = new this.dataModel(data);
    return newData.save();
  }
}
