import {Model} from 'mongoose';
import {Injectable, Inject} from '@nestjs/common';
import {ComplainPayload} from '../payloads/complain.payload';
import {ComplainDocument} from '../schemas/complain.schema';
import {ModelEnum} from '../../../enums/model.enum';

@Injectable()
export class UserComplainService {
  constructor(
    @Inject(ModelEnum.Complains)
    private dataModel: Model<ComplainDocument>,
  ) {}

  async create(complain: ComplainPayload): Promise<any> {
    const createData = new this.dataModel(complain);
    return createData.save();
  }

  async findAll(): Promise<any> {
    return this.dataModel.find().exec();
  }
}
