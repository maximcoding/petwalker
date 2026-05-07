import {Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards} from '@nestjs/common';
import {ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags} from '@nestjs/swagger';
import {AuthGuard} from '@nestjs/passport';

import {ArticleService} from './article.service';
import {CreateArticleDto} from './dto/create-article.dto';
import {ApiImplicitParam} from '@nestjs/swagger/dist/decorators/api-implicit-param.decorator';
import {Roles} from '../auth/decorators/roles.decorator';
import {ApiImplicitHeader} from '@nestjs/swagger/dist/decorators/api-implicit-header.decorator';
import {ModelEnum} from '../../enums/model.enum';
import {RoleEnum} from '../../enums/role.enum';
import {RolesGuard} from '../auth/guards/roles.guard';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';

@ApiTags('Articles')
@Controller(ModelEnum.Articles)
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({description: 'Get All article'})
  @ApiOkResponse({})
  async getAllArticle() {
    return await this.articleService.getAllArticles();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({description: 'Get One article'})
  @ApiImplicitParam({name: 'id', description: 'id of article'})
  @ApiOkResponse({})
  async getOneArticles(@Param() params) {
    return await this.articleService.getOneArticle(params.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.Admin)
  @ApiOperation({description: 'Create one article'})
  @ApiImplicitHeader({
    name: 'Bearer',
    description: 'the token we need for auth.',
  })
  @ApiCreatedResponse({})
  async createArticle(@Body() createArticleDto: CreateArticleDto) {
    return await this.articleService.createArticle(createArticleDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(RoleEnum.Admin)
  @ApiOperation({description: 'Update one article by id ( all params )'})
  @ApiImplicitParam({name: 'id', description: 'id of article'})
  @ApiImplicitHeader({
    name: 'Bearer',
    description: 'the token we need for auth.',
  })
  @ApiOkResponse({})
  async updateWithAllParams(@Param() params, @Body() createArticleDto: CreateArticleDto) {
    return await this.articleService.updateArticlePut(params.id, createArticleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleEnum.Admin)
  @ApiOperation({description: 'Delete one article'})
  @ApiImplicitHeader({
    name: 'Bearer',
    description: 'the token we need for auth.',
  })
  @ApiImplicitParam({
    name: 'id',
    description: 'id of article we want to delete.',
  })
  @ApiOkResponse({})
  async deleteOneArticle(@Param() params) {
    return await this.articleService.deleteArticle(params.id);
  }
}
