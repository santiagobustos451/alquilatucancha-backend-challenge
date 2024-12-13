import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { CourtUpdatedEvent } from '../events/court-updated.event';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@EventsHandler(CourtUpdatedEvent)
export class CourtUpdatedHandler implements IEventHandler<CourtUpdatedEvent> {
  private readonly logger = new Logger(CourtUpdatedHandler.name);

  constructor(
    private readonly redisClient: RedisClient,
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private readonly alquilaTuCanchaClient: AlquilaTuCanchaClient,
  ) {}

  async handle(event: CourtUpdatedEvent) {
    this.logger.log(
      `Cancha ${event.courtId} del club ${event.clubId} actualizado con fields ${event.fields}`,
    );

    try {
      // Borrar el cache relacionado con el club
      await this.redisClient.delFromCache(`courts-${event.clubId}`);

      // Obtener los datos actualizados desde el cliente HTTP, se cachean
      await this.alquilaTuCanchaClient.getCourts(event.clubId);

      this.logger.log(
        `Las canchas del club con ID ${event.clubId} han sido actualizadas en el cache.`,
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar las canchas del club con ID ${
          event.clubId
        } | ${JSON.stringify(error)}`,
      );
    }
  }
}
