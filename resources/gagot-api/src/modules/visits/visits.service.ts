import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {Model} from 'mongoose';
import {IVisit, VisitDocument} from './visit.schema';
import {PropertiesService} from '../properties/properties.service';
import {UserService} from '../users/services/user.service';
import {CreateVisitPayload} from './payloads/create-visit.payload';
import {UpdateVisitPayload} from './payloads/update-visit-payload';

@Injectable()
export class VisitsService {
  constructor(
    @Inject(ModelEnum.Visits) private dataModel: Model<VisitDocument>,
    private propertiesService: PropertiesService,
    private userService: UserService,
  ) {}

  public async create(payload: CreateVisitPayload): Promise<IVisit> {
    const property = await this.propertiesService.findById(payload.propertyId);
    const createData = new this.dataModel(payload);
    createData.property = property._id;
    return createData.save();
  }

  public async createBulk(propertyId, payload: CreateVisitPayload[]): Promise<IVisit[]> {
    const property = await this.propertiesService.findById(propertyId);
    if (payload.some((p) => p.propertyId !== property.propertyId)) {
      throw new NotFoundException('some visit has different propertyId');
    }
    return this.dataModel.insertMany(payload).catch((err) => {
      throw new BadRequestException('failed to save visits ' + err);
    });
  }

  public async findById(visitId: string): Promise<any> {
    const found = await this.dataModel.findById(visitId, {}).populate('visitors').populate('property').exec();
    if (!found) {
      throw new NotFoundException('no open door events for the property');
    }
    return found;
  }

  public async findByProperty(propertyId: string): Promise<IVisit[]> {
    const property = await this.propertiesService.findById(propertyId);
    const found = this.dataModel.find({property: property._id}).populate('visitors').populate('property').exec();
    if (!found) {
      throw new NotFoundException('no open door events for the property');
    }
    return found;
  }

  public async update(id: string, payload: UpdateVisitPayload): Promise<IVisit> {
    const property = await this.propertiesService.findById(payload.propertyId);
    try {
      const data = {...payload, property: property._id};
      return await this.dataModel.findOneAndUpdate({_id: id}, data).exec();
    } catch (e) {
      throw new BadRequestException('cannot update visit');
    }
  }

  public async addVisitor(visitId: string, userId: string): Promise<IVisit> {
    const found = await this.findById(visitId);
    const user = await this.userService.findById(userId);
    found.visitors.push(user);
    return await found.save();
  }

  public async removeVisitor(visitId: string, userId: string): Promise<IVisit> {
    const visit = await this.findById(visitId);
    const user = await this.userService.findById(userId);
    visit.visitors.pull(user._id);
    return await visit.save();
  }

  public async remove(visitId: string): Promise<void> {
    try {
      const removed = await this.dataModel.remove(visitId).exec();
    } catch (e) {
      throw new BadRequestException('cannot remove visit');
    }
  }
}
