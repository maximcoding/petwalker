import {ArrayUnique, IsEnum, IsMongoId, IsNotEmpty, IsNumber} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';
import {IRoom} from '../room.schema';
import {RoomEnum} from '../../../enums/roomEnum';
import {BathEnum} from '../../../enums/bath.enum';

export class CreateRoomPayload implements IRoom {
  @ApiProperty({
    enumName: 'RoomEnum',
    default: RoomEnum.Bedroom,
    required: false,
    isArray: false,
  })
  @IsEnum(RoomEnum)
  @IsNotEmpty()
  type: RoomEnum;

  @ApiProperty({
    enum: BathEnum,
    enumName: 'BathEnum',
    default: BathEnum.bath,
    isArray: true,
    required: false,
  })
  @IsEnum(BathEnum, {each: true})
  @IsNotEmpty()
  @ArrayUnique()
  bath: BathEnum[];

  @ApiProperty({
    description: 'room order',
    type: Number,
    required: true,
  })
  @IsNumber()
  @IsNotEmpty()
  order: number;

  @ApiProperty({
    description: 'property id',
    type: String,
    required: true,
  })
  @IsMongoId()
  propertyId: string;
}
