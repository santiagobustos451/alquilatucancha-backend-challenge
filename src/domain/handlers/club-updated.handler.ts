import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { ClubUpdatedEvent } from '../events/club-updated.event';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@EventsHandler(ClubUpdatedEvent)
export class ClubUpdatedHandler implements IEventHandler<ClubUpdatedEvent> {
  private readonly logger = new Logger(ClubUpdatedHandler.name);
  private readonly DEFAULT_TTL: number;

  constructor(
    private readonly redisClient: RedisClient,
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private readonly alquilaTuCanchaClient: AlquilaTuCanchaClient,
    private readonly configService: ConfigService,
  ) {
    this.DEFAULT_TTL = parseInt(
      this.configService.get<string>('DEFAULT_TTL', '3600'),
    );
  }

  async handle(event: ClubUpdatedEvent) {
    this.logger.log(
      `Club ${event.clubId} actualizado con fields ${event.fields}`,
    );

    try {
      // Obtener los datos actualizados desde el cliente HTTP
      const updatedClub = await this.alquilaTuCanchaClient.getClubById(
        event.clubId,
      );

      // Borrar el cache relacionado con el club
      await this.redisClient.delFromCache(`club-${event.clubId}`);

      // Cachear el club actualizado
      await this.redisClient.setToCache(
        `club-${event.clubId}`,
        updatedClub,
        this.DEFAULT_TTL,
      );

      this.logger.log(
        `El club con ID ${event.clubId} ha sido actualizado en el cache.`,
      );

      if (event.fields.includes('openhours')) {
        const slotKeys = await this.redisClient.keys(`slots:${event.clubId}:*`);
        await Promise.all(
          slotKeys.map(async (slot) => {
            await this.redisClient.delFromCache(slot);
          }),
        );
      }
    } catch (error) {
      this.logger.error(
        `Error al actualizar el club con ID ${event.clubId} | ${JSON.stringify(
          error,
        )}`,
      );
    }
  }
}
