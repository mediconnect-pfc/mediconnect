import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [InteractionsController],
  providers: [InteractionsService, RolesGuard],
})
export class InteractionsModule {}
