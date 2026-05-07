import {Model, ObjectId} from 'mongoose';
import {Injectable, Inject} from '@nestjs/common';
import {ReviewDocument} from './review.schema';
import {ModelEnum} from '../../enums/model.enum';

@Injectable()
export class ReviewsService {
  constructor(@Inject(ModelEnum.Reviews) private dataModel: Model<ReviewDocument>) {}

  async create(reviewDto: any): Promise<ReviewDocument> {
    const createData = new this.dataModel(reviewDto);
    return await createData.save();
  }

  async remove(id: string): Promise<void> {
    return await this.dataModel.remove(id).exec();
  }

  async findAll(): Promise<ReviewDocument[]> {
    return this.dataModel.find().exec();
  }

  async findByProperty(propertyId: string): Promise<ReviewDocument[]> {
    return this.dataModel.find().where('property._id').equals(propertyId).exec();
  }

  async findByAuthor(authorId: string): Promise<ReviewDocument[]> {
    return this.dataModel.find().where('author._id').equals(authorId).exec();
  }
}
