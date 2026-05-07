import {Inject, Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {Property} from '../modules/properties/propertySchema';
import {Seeder, DataFactory} from 'nestjs-seeder';

@Injectable()
export class PropertiesSeeder implements Seeder {
  constructor(@InjectModel(Property.name) private readonly dataModel: Model<Property>) {}

  seed(): Promise<any> {
    const data = DataFactory.createForClass(Property).generate(50);
    return this.dataModel.insertMany(data);
  }

  drop(): Promise<any> {
    return this.dataModel.deleteMany({}) as any;
  }
}
