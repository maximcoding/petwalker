import {forwardRef, Module} from '@nestjs/common';
import {UserController} from './controllers/user.controller';
import {UserService} from './services/user.service';
import {usersProviders} from './user.provider';
import {DatabaseModule} from '../database';
import {AuthModule} from '../auth/auth.module';
import {EmailModule} from '../email/email.module';
import {SmsModule} from '../sms/sms.module';
import {UserComplainService} from './services/user-complain.service';
import {UserComplainController} from './controllers/user-complain.controller';
import {FilesModule} from '../files/files.module';
import {ReviewsService} from '../reviews/reviews.service';
import {ReviewsController} from '../reviews/reviews.controller';

@Module({
  imports: [FilesModule, EmailModule, SmsModule, DatabaseModule, forwardRef(() => AuthModule)],
  controllers: [UserController, UserComplainController, ReviewsController],
  providers: [UserService, ReviewsService, UserComplainService, ...usersProviders],
  exports: [UserService, ReviewsService, UserComplainService],
})
export class UserModule {}
