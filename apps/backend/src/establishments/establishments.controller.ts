import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstablishmentsService } from './establishments.service';
import { CreateEstablishmentDto } from './dto/create-establishment.dto';
import { UpdateEstablishmentDto } from './dto/update-establishment.dto';

@Controller('establishments')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class EstablishmentsController {
  constructor(private readonly establishmentsService: EstablishmentsService) {}

  // GET /establishments → liste tous les établissements (Super Admin only)
  @Get()
  findAll() {
    return this.establishmentsService.findAll();
  }

  // GET /establishments/:id → voir un établissement
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.establishmentsService.findOne(id);
  }

  // POST /establishments → créer un établissement (Super Admin only)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEstablishmentDto) {
    return this.establishmentsService.create(dto);
  }

  // PATCH /establishments/:id → modifier un établissement
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEstablishmentDto) {
    return this.establishmentsService.update(id, dto);
  }

  // DELETE /establishments/:id → désactiver un établissement (Super Admin only)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.establishmentsService.remove(id);
  }
}
