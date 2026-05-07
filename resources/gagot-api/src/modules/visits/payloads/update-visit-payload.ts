import {DayOfTheWeekEnum, IVisit} from '../visit.schema';
import {ApiProperty} from '@nestjs/swagger';
import {IsArray, IsDate, IsDateString, IsMongoId, IsString} from 'class-validator';
import {IUser} from '../../users/interfaces/user.interface';

export class UpdateVisitPayload implements IVisit {
  @ApiProperty({type: Date, required: true})
  @IsDateString()
  date?: Date;

  @ApiProperty({type: String, enum: DayOfTheWeekEnum, enumName: 'DayOfTheWeekEnum', required: true})
  @IsString()
  day?: DayOfTheWeekEnum;

  @ApiProperty({description: 'time 24 hours', type: String, default: '08:00'})
  @IsString()
  timeFrom?: string;

  @ApiProperty({description: 'time 24 hours', type: String, default: '22:00'})
  @IsString()
  timeTo?: string;

  @ApiProperty({description: 'property id'})
  @IsMongoId()
  propertyId: string;
}
