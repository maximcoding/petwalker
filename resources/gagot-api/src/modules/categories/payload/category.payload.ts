import {ICategory} from '../category.schema';
import {CategoryEnum} from '../../../enums/categoryEnum';
import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsNotEmpty, IsString} from 'class-validator';

export class CategoryPayload implements ICategory {
  @ApiProperty({
    description: 'category name',
    required: true,
    enum: CategoryEnum,
    enumName: 'CategoriesEnum',
  })
  @IsNotEmpty()
  name: CategoryEnum;

  @IsString()
  @ApiProperty({
    description: 'photo url',
    required: true,
  })
  @IsNotEmpty()
  photoUrl: string;
}

export class CategoriesPayload {
  @ApiProperty({
    description: 'array of categories',
  })
  @IsNotEmpty()
  @IsArray()
  categories: ICategory[];
}
