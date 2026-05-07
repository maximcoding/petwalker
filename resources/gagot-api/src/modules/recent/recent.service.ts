import { Model } from 'mongoose';
import { Injectable, Inject } from '@nestjs/common';
import { Recent } from './recent.document';
import { RECENT_PROVIDER } from './recent.providers';

@Injectable()
export class RecentService {
  constructor(
    @Inject(RECENT_PROVIDER)
    private dataModel: Model<Recent>,
  ) {}

  async create(createDto): Promise<Recent> {
    const createData = new this.dataModel(createDto);
    return createData.save();
  }

  async findAll(): Promise<Recent[]> {
    return this.dataModel.find().exec();
  }
}
