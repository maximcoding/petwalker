import {Model} from 'mongoose';
import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {ModelEnum} from '../../enums/model.enum';
import {FilesService} from '../files/files.service';
import {IRoom, RoomDocument} from './room.schema';
import {AppFileEnum} from '../files/aws-file.schema';
import {CreateRoomPayload} from './payloads/create-room.payload';
import {PropertyDocument} from '../properties/propertySchema';

@Injectable()
export class RoomsService {
  constructor(
    @Inject(ModelEnum.Rooms) private dataModel: Model<RoomDocument>,
    @Inject(ModelEnum.Properties) private propertiesModel: Model<PropertyDocument>,
    private readonly filesService: FilesService,
  ) {}

  public async findById(roomId: string): Promise<any> {
    const found = this.dataModel.findById(roomId).populate(AppFileEnum.images).populate(AppFileEnum.images360).exec();
    if (!found) {
      throw new NotFoundException('room no found');
    }
    return found;
  }

  public async findByProperty(propertyId: string): Promise<IRoom[]> {
    const found = this.dataModel.find({propertyId}).exec();
    if (!found) {
      throw new NotFoundException('no rooms for the property');
    }
    return found;
  }

  public async create(data: CreateRoomPayload): Promise<IRoom> {
    const property = await this.propertiesModel.findById(data.propertyId).exec();
    if (!property.additionalDetails) {
      throw new NotFoundException('properties room could not be saved. Additional Details was not selected');
    }
    const createdRoom = new this.dataModel(data);
    await createdRoom.save();
    property.rooms.push(createdRoom);
    await property.save();
    return createdRoom;
  }

  public async createBulk(data: IRoom[]): Promise<IRoom[]> {
    try {
      const property = await this.propertiesModel.findById(data[0].property).exec();
      if (!property.additionalDetails) {
        throw new NotFoundException('properties rooms could be saved. Additional Details was not selected');
      }
      const createdRooms = await this.dataModel.insertMany(data);
      property.rooms = createdRooms;
      await property.save();
      return createdRooms;
    } catch (e) {
      throw new BadRequestException('failed to save rooms');
    }
  }

  public async update(id: string, data: IRoom): Promise<IRoom> {
    try {
      return await this.dataModel.findByIdAndUpdate(id, data).exec();
    } catch (e) {
      throw new NotFoundException('failed to update room');
    }
  }

  public async uploadRoomImage(roomId: string, file: Express.Multer.File, type: AppFileEnum): Promise<IRoom> {
    const found = await this.findById(roomId);
    switch (type) {
      case AppFileEnum.image:
      case AppFileEnum.image360:
        const uploaded = await this.filesService.uploadPublicFile(file, AppFileEnum[type]);
        found.image = uploaded;
        break;
    }
    return await found.save();
  }

  public async deleteRoomImage(id: string, fileId: string, type: AppFileEnum): Promise<IRoom> {
    const room = await this.findById(id);
    await this.filesService.deletePublicFile(fileId);
    switch (type) {
      case AppFileEnum.image:
        room.images.pull(fileId);
        break;
      case AppFileEnum.image360:
        room.images360.pull(fileId);
        break;
    }
    return await room.save();
  }

  public async deleteRoomImages(id: string, type: AppFileEnum): Promise<IRoom> {
    const room = await this.findById(id);
    switch (type) {
      case AppFileEnum.image:
        await this.filesService.deletePublicFiles(room.images);
        room.images = [];
        break;
      case AppFileEnum.image360:
        await this.filesService.deletePublicFiles(room.images360);
        room.images360 = [];
        break;
    }
    return await room.save();
  }

  public async delete(id: string): Promise<any> {
    const found = await this.findById(id);
    await this.propertiesModel.updateOne(found.property._id, {$pull: {rooms: found._id}}).exec();
    await found.remove();
  }

  public async deleteWhenProperty(id: string): Promise<any> {
    return this.dataModel.remove({property: id}).exec();
  }
}
