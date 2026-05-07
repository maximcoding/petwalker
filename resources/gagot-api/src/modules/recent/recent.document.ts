import { Document } from 'mongoose';

export interface Recent extends Document {
  readonly propertyID: string;
  readonly userID: string;
}
