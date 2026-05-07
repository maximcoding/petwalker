import {Model} from 'mongoose';
import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {IProperty, PropertyDocument, PropertyStatus} from './propertySchema';
import {PatchPropertyPayload} from './payload/patch-property.payload';
import {ModelEnum} from '../../enums/model.enum';
import {
  DeleteImagePayload,
  IFindAllPropertiesResponse,
  QueryPropertiesByCategoryPayload,
  QueryPropertiesPayload,
} from './payload/query-property.payload';
import {ICategory} from '../categories/category.schema';
import {CategoriesService} from '../categories/catagories.service';
import {FilesService} from '../files/files.service';
import {AppFileEnum, IAppDocumentFile, IAppFile, IAwsFile} from '../files/aws-file.schema';
import {CreatePropertyPayload} from './payload/create-property.payload';
import {stringToBoolean} from '../../helpers/string-boolean.parser';
import {limitMax4Files} from '../../helpers/check-limit.files';
import {RoomDocument} from '../rooms/room.schema';
import {VisitDocument} from '../visits/visit.schema';
import {FilterPropertiesPayload} from './payload/filter-properties.payload';
import {SquareUnitsConverter} from '../../helpers/square-units.converter';
import {MeasurementEnum} from '../../enums/measurement.enum';

export enum SortBy {
  new = 'new',
  old = 'old',
  highestPrice = 'highestPrice',
  lowestPrice = 'lowestPrice',
  rating = 'rating',
}

@Injectable()
export class PropertiesService {
  private categoryNameMap: {[key: string]: ICategory} = {};

  constructor(
    @Inject(ModelEnum.Properties) private dataModel: Model<PropertyDocument>,
    private categoryService: CategoriesService,
    private readonly filesService: FilesService,
    @Inject(ModelEnum.Visits) private visitsModel: Model<VisitDocument>,
    @Inject(ModelEnum.Rooms) private roomsModel: Model<RoomDocument>,
  ) {
    (async () => {
      const categories = await this.categoryService.findAll();
      this.categoryNameMap = {};
      categories.forEach((cat: ICategory) => {
        this.categoryNameMap[cat.name] = cat;
      });
    })();
  }

  async findAll(params: QueryPropertiesPayload, filter?: any): Promise<IFindAllPropertiesResponse> {
    const query = this.dataModel.find(filter ? filter : {});
    if (stringToBoolean(params.preview)) {
      const projection = {
        categoryName: 1,
        address: 1,
        coordinate: 1,
        square: 1,
        livingRooms: 1,
        bedrooms: 1,
        bathrooms: 1,
        balconies: 1,
        status: 1,
        title: 1,
        type: 1,
        floors: 1,
        price: 1,
        deposit: 1,
        createdAt: 1,
        updatedAt: 1,
      };
      query.populate(AppFileEnum.images, {mimetype: 1, url: 1, _id: 1, key: 1}).select(projection);
    } else {
      query
        .populate('owner', {firstName: 1, lastName: 1, _id: 1})
        .populate('visits')
        .populate('rooms')
        .populate(AppFileEnum.images, {mimetype: 1, url: 1, _id: 1, key: 1})
        .populate(AppFileEnum.images360, {mimetype: 1, url: 1, _id: 1, key: 1})
        .populate(AppFileEnum.video, {mimetype: 1, url: 1, _id: 1, key: 1})
        .populate(AppFileEnum.audio, {mimetype: 1, url: 1, _id: 1, key: 1})
        .populate(AppFileEnum.agreement, {mimetype: 1, url: 1, _id: 1, key: 1})
        .populate(AppFileEnum.cancellation, {mimetype: 1, url: 1, _id: 1, key: 1})
        .populate(AppFileEnum.rules, {mimetype: 1, url: 1, _id: 1, key: 1});
    }
    if (params.sort) {
      query.sort(this.sortBy(params.sort));
    }
    const total = await this.dataModel.count(filter);
    let data = [];
    let limit = null;
    let page = null;
    if (params.page) {
      page = parseInt(params.page as any) || 1;
      limit = parseInt(params.limit as any) || 20;
      data = await query
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
    } else {
      data = await query.exec();
    }
    return {
      properties: data,
      total,
      page,
      last_page: Math.ceil(total / limit),
    };
  }

  async filterProperties(payload: FilterPropertiesPayload): Promise<IFindAllPropertiesResponse> {
    const filter = {};
    if (payload?.categoryName?.length) {
      filter['categoryName'] = {$in: payload.categoryName};
    }
    if (payload?.state?.length) {
      filter['state'] = {$in: payload.state};
    }
    if (payload?.bedrooms > 0) {
      filter['bedrooms'] = {$gte: payload.bedrooms};
    }
    if (payload?.bathrooms > 0) {
      filter['bathrooms'] = {$gte: payload.bathrooms};
    }
    if (payload?.floors > 0) {
      filter['floors'] = {$gte: payload.floors};
    }
    if (payload?.newConstruction != null) {
      filter['newConstruction'] = payload.newConstruction;
    }
    if (payload?.onTheLand != null) {
      filter['onTheLand'] = payload.onTheLand;
    }
    if (payload?.nextTo?.length) {
      filter['nextTo'] = {$in: payload.nextTo};
    }
    if (payload?.amenities?.length) {
      filter['amenities'] = {$in: payload.amenities};
    }
    if (payload?.facilities?.length) {
      filter['facilities'] = {$in: payload.facilities};
    }
    if (payload?.kitchen?.length) {
      filter['kitchen'] = {$in: payload.kitchen};
    }
    if (payload?.safetyAmenities?.length) {
      filter['safetyAmenities'] = {$in: payload.safetyAmenities};
    }
    if (payload?.publishedFromDate) {
      filter['createdAt'] = {$gte: new Date(payload.publishedFromDate).toISOString()};
    }
    if (payload?.entryDate) {
      filter['entryDate'] = {$gte: new Date(payload.entryDate).toISOString()};
    }
    if (payload?.priceMin >= 0 && payload.priceMax > payload.priceMin) {
      filter['price'] = {$gte: payload.priceMin, $lte: payload.priceMax};
    }
    if (payload?.squareMin >= 0 && payload.squareMin > payload.squareMin) {
      filter['square'] = {$gte: payload.squareMin, $lte: payload.squareMin};
    }
    return await this.findAll(payload, filter);
  }

  async findWithFilesById(id: string, attr: AppFileEnum): Promise<PropertyDocument> {
    const found = await this.dataModel.findById(id).populate(attr).exec();
    if (!found) {
      throw new NotFoundException('no data found');
    }
    return found;
  }

  async findById(id: string): Promise<any> {
    const found = await this.dataModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException('no data found');
    }
    return found;
  }

  async findByIdPopulate(id: string): Promise<any> {
    const found = await this.dataModel
      .findById(id)
      .populate('visits')
      .populate(AppFileEnum.images, {mimetype: 1, url: 1, _id: 1, key: 1})
      .populate(AppFileEnum.images360, {mimetype: 1, url: 1, _id: 1, key: 1})
      .populate(AppFileEnum.video, {mimetype: 1, url: 1, _id: 1, key: 1})
      .populate(AppFileEnum.audio, {mimetype: 1, url: 1, _id: 1, key: 1})
      .populate(AppFileEnum.agreement, {mimetype: 1, url: 1, _id: 1, key: 1})
      .populate(AppFileEnum.cancellation, {mimetype: 1, url: 1, _id: 1, key: 1})
      .populate(AppFileEnum.rules, {mimetype: 1, url: 1, _id: 1, key: 1})
      .exec();
    if (!found) {
      throw new NotFoundException('no data found');
    }
    return found;
  }

  async findByCategory(query: QueryPropertiesByCategoryPayload): Promise<IFindAllPropertiesResponse> {
    this.checkCategoryExist(query.categoryName);
    return await this.findAll(query, {categoryName: query.categoryName});
  }

  // PROPERTY_MOCK
  async create(user, data: CreatePropertyPayload): Promise<IProperty> {
    const square = this.convertSquareUnits(data);
    this.checkCategoryExist(data.categoryName);
    const property = new this.dataModel({...data, owner: user._id, square, squareUnits: MeasurementEnum.meter});
    return property.save();
  }

  async updateById(id: string, data: PatchPropertyPayload): Promise<PropertyDocument> {
    this.checkCategoryExist(data.categoryName);
    const square = this.convertSquareUnits(data);
    try {
      return await this.dataModel.findByIdAndUpdate(id, {...data, square}).exec();
    } catch (e) {
      throw new BadRequestException('property could no be updated');
    }
  }

  async updateStatus(id: string, status: PropertyStatus): Promise<IProperty> {
    const property = await this.findById(id);
    property.status = status;
    return property.save();
  }

  async updateAdditionalDetails(id: string, additionalDetails: boolean): Promise<IProperty> {
    const property = await this.findById(id);
    property.additionalDetails = additionalDetails;
    return property.save();
  }

  public async uploadAudioFile(id: string, file: Express.Multer.File): Promise<IProperty> {
    const property = await this.findWithFilesById(id, AppFileEnum.audio);
    await this.cleanPreviousFile(property.audio);
    property.audio = await this.filesService.uploadPublicFile(file, AppFileEnum.audio);
    return await property.save();
  }

  public async uploadVideoFile(id: string, file: Express.Multer.File): Promise<IProperty> {
    const property = await this.findWithFilesById(id, AppFileEnum.video);
    await this.cleanPreviousFile(property.video);
    property.video = await this.filesService.uploadPublicFile(file, AppFileEnum.video);
    return await property.save();
  }

  public async uploadImageFile(id: string, file: IAppFile): Promise<IProperty> {
    switch (file.type) {
      case AppFileEnum.image:
        const property = await this.findWithFilesById(id, AppFileEnum.images);
        const uploaded = await this.filesService.uploadPublicFile(file, AppFileEnum.images);
        limitMax4Files(property.images);
        property.images.push(uploaded);
        return await property.save();
      case AppFileEnum.images360:
        const property2 = await this.findWithFilesById(id, AppFileEnum.images360);
        const uploaded2 = await this.filesService.uploadPublicFile(file, AppFileEnum.images360);
        limitMax4Files(property2.images360);
        property2.images360.push(uploaded2);
        return await property2.save();
    }
  }

  public async uploadImages(id: string, data: Express.Multer.File[]): Promise<IProperty> {
    const property = await this.findWithFilesById(id, AppFileEnum.images);
    await this.cleanPreviousFiles(property.images);
    limitMax4Files(data['files']);
    property.images = [];
    await Promise.all(
      data['files'].map(async (file) => {
        const uploaded = await this.filesService.uploadPublicFile(file, AppFileEnum.image);
        property.images.push(uploaded);
      }),
    );
    return property.save();
  }

  public async upload360Images(id: string, files: Express.Multer.File[]): Promise<IProperty> {
    const property = await this.findWithFilesById(id, AppFileEnum.images360);
    await this.cleanPreviousFiles(property.images360);
    limitMax4Files(files);
    property.images360 = [];
    await Promise.all(
      files.map(async (file) => {
        const uploaded = await this.filesService.uploadPublicFile(file, AppFileEnum.image360);
        property.images360.push(uploaded);
      }),
    );
    return property.save();
  }

  public async uploadDocFile(id: string, file: Express.Multer.File): Promise<IProperty> {
    const fileType = (file as IAppDocumentFile)?.type;
    const property = await this.findWithFilesById(id, fileType);
    const previousFile = property[fileType]; // agreement, cancellation, rules,
    await this.cleanPreviousFiles(previousFile);
    const uploaded = await this.filesService.uploadPublicFile(file, fileType);
    property[fileType] = uploaded;
    return property.save();
  }

  public async deleteAudioFile(id: string, fileId: string): Promise<void> {
    const property = await this.dataModel.findByIdAndUpdate(id);
    if (property.audio?.toString() !== fileId.trim()) {
      throw new BadRequestException('audio file not found');
    }
    const deleted = await this.filesService.deletePublicFile(fileId, AppFileEnum.audio);
    property.audio = null;
    property.save();
  }

  public async deleteVideoFile(id: string, fileId: string): Promise<void> {
    const property = await this.findById(id);
    if (property.video?.toString() !== fileId.trim()) {
      throw new BadRequestException('video file not found');
    }
    const deleted = await this.filesService.deletePublicFile(fileId, AppFileEnum.video);
    property.video = null;
    property.save();
  }

  public async deleteDocFile(id: string, fileId: string, docType: AppFileEnum): Promise<void> {
    const property = await this.findById(id);
    if (property[docType]?.toString() !== fileId.trim()) {
      throw new BadRequestException(docType + ' file not found');
    }
    const deleted = await this.filesService.deletePublicFile(fileId, AppFileEnum[docType]);
    property[docType] = null;
    property.save();
  }

  public async deleteImageFile(id: string, fileId: string, type: AppFileEnum): Promise<void> {
    const property = await this.findById(id);
    if (property[type]?.toString() !== fileId.trim()) {
      throw new BadRequestException('image file not found');
    }
    switch (type) {
      case AppFileEnum.images:
        await this.filesService.deletePublicFile(fileId, type);
        property.images.pull(fileId);
        break;
      case AppFileEnum.image360:
        await this.filesService.deletePublicFile(fileId, type);
        property.images360.pull(fileId);
        break;
    }
    property.save();
  }

  public async deletePropertyImages(propertyId: string, query: DeleteImagePayload): Promise<void> {
    const property = await this.findById(propertyId);
    switch (query.type) {
      case AppFileEnum.image:
        if (!property.images?.length) {
          throw new NotFoundException('property images not found');
        }
        await this.filesService.deletePublicFiles(property.images);
        property.images = [];
        break;
      case AppFileEnum.image360:
        if (!property.images360?.length) {
          throw new NotFoundException('property images not found');
        }
        await this.filesService.deletePublicFiles(property.images);
        property.images360 = [];
        break;
    }
    property.save();
  }

  private async cleanPreviousFiles(previousFiles: IAwsFile[]): Promise<IAwsFile[]> {
    const deleted = [];
    const data = previousFiles.filter((obj) => !!obj);
    if (data.length) {
      data.map(async (previous) => {
        const deletedFile = await this.filesService.deletePublicFile(previous._id, previous.fileType);
        deleted.push(deletedFile);
      });
    }
    return deleted;
  }

  private async cleanPreviousFile(previousFile: IAwsFile): Promise<void> {
    if (previousFile) {
      await this.filesService.deletePublicFile(previousFile._id, previousFile.fileType);
    }
  }

  async rate(propertyId: string): Promise<PropertyDocument> {
    return this.dataModel.findOneAndUpdate({_id: propertyId}, {$inc: {rating: 1}}).exec();
  }

  async deleteById(id: string): Promise<void> {
    const found = await this.findById(id);
    await this.cleanPreviousFiles([
      ...found.images,
      ...found.images360,
      found.agreement,
      found.cancellation,
      found.rules,
      found.video,
      found.audio,
    ]);
    await this.roomsModel.remove({property: found._id}).exec();
    await this.visitsModel.remove({property: found._id}).exec();
    await this.dataModel.deleteOne({_id: found._id});
  }

  private checkCategoryExist(categoryName: string) {
    const category = this.categoryNameMap[categoryName];
    if (!category) {
      throw new NotFoundException('category name does not exist');
    }
  }

  private convertSquareUnits(data) {
    switch (data.squareUnits) {
      case MeasurementEnum.feet:
        return SquareUnitsConverter.feetToMeterConverter(data.square);
    }
    return data.square;
  }

  private sortBy(sort: SortBy): string {
    let type;
    switch (sort) {
      case SortBy.new:
        type = {createdAt: -1};
        break;
      case SortBy.old:
        type = {createdAt: +1};
        break;
      case SortBy.lowestPrice:
        type = {price: +1};
        break;
      case SortBy.highestPrice:
        type = {price: -1};
        break;
      case SortBy.rating:
        type = {rating: -1};
        break;
    }
    return type;
  }
}
