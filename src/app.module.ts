import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { AlquilaTuCanchaCacheService } from './domain/cache/alquila-tu-cancha-cache.service';
import { PrecacheService } from './domain/cache/alquila-tu-cancha-precache.service';
import { ClubUpdatedHandler } from './domain/handlers/club-updated.handler';
import { CourtUpdatedHandler } from './domain/handlers/court-updated.handler';
import { GetAvailabilityHandler } from './domain/handlers/get-availability.handler';
import { SlotAvailableHandler } from './domain/handlers/slot-available.handler';
import { SlotBookedHandler } from './domain/handlers/slot-booked.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from './domain/ports/aquila-tu-cancha.client';
import { HTTPAlquilaTuCanchaClient } from './infrastructure/clients/http-alquila-tu-cancha.client';
import { EventsController } from './infrastructure/controllers/events.controller';
import { SearchController } from './infrastructure/controllers/search.controller';
import { RedisModule } from './infrastructure/redis/redis.module';

@Module({
  imports: [HttpModule, CqrsModule, ConfigModule.forRoot(), RedisModule],
  controllers: [SearchController, EventsController],
  providers: [
    {
      provide: ALQUILA_TU_CANCHA_CLIENT,
      useClass: HTTPAlquilaTuCanchaClient,
    },
    AlquilaTuCanchaCacheService,
    GetAvailabilityHandler,
    ClubUpdatedHandler,
    CourtUpdatedHandler,
    SlotAvailableHandler,
    SlotBookedHandler,
    PrecacheService,
  ],
})
export class AppModule {}
