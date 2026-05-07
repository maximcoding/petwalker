import {DayOfTheWeekEnum, IVisit} from '../visit.schema';
import {IProperty} from '../../properties/propertySchema';
import {IUser} from '../../users/interfaces/user.interface';
import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsDate, IsDateString, IsMongoId, IsString} from 'class-validator';

export class CreateVisitPayload {
  @ApiProperty({description: 'date'})
  @IsDateString()
  date: Date;

  @ApiProperty({description: 'date', enum: DayOfTheWeekEnum, enumName: 'DayOfTheWeekEnum'})
  @IsString()
  day: DayOfTheWeekEnum;

  @ApiProperty({description: 'default is 8:00', type: String})
  @IsString()
  timeFrom: string;

  @ApiProperty({description: 'default is 22:00', type: String})
  @IsString()
  timeTo: string;

  @ApiProperty({description: 'users ids', type: [String]})
  @IsArray()
  visitors: string[];

  @ApiProperty({description: 'property id', type: String})
  @IsMongoId()
  propertyId: string;
}
