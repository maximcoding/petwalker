import {seeder} from 'nestjs-seeder';
import {PropertiesSeeder} from './seeders/properties.seeder';
import {MongooseModule} from '@nestjs/mongoose';
import {Property, PropertySchema} from './modules/properties/propertySchema';
import {UsersSeeder} from './seeders/users.seeder';
import {CategoriesSeeder} from './seeders/categories.seeder';
import {Category, CategorySchema} from './modules/categories/category.schema';
import {User, UserSchema} from './modules/users/schemas/user.schema';

const url = 'mongodb+srv://developer:38Hn7ioL4PweEM94@cluster0.gx2mi.mongodb.net/gagotapp?retryWrites=true&w=majority';

seeder({
  imports: [
    MongooseModule.forRoot(url),
    MongooseModule.forFeature([
      {name: User.name, schema: UserSchema},
      {name: Category.name, schema: CategorySchema},
      {name: Property.name, schema: PropertySchema},
    ]),
  ],
}).run([UsersSeeder, CategoriesSeeder, PropertiesSeeder]);
