import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';

@Module({
  imports: [PrismaModule],
  controllers: [DossiersController],
  providers: [DossiersService],
})
export class DossiersModule {}
