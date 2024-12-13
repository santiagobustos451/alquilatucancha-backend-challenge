import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { SlotAvailableEvent } from '../events/slot-cancelled.event';

@EventsHandler(SlotAvailableEvent)
export class SlotAvailableHandler implements IEventHandler<SlotAvailableEvent> {
  private readonly logger = new Logger(SlotAvailableHandler.name);

  constructor(private readonly redisClient: RedisClient) {}

  async handle(event: SlotAvailableEvent) {
    const cacheKey = `slots:${event.clubId}:${event.courtId}:${moment(
      event.slot.datetime,
    ).format('YYYY-MM-DD')}`;
    this.logger.log(
      `Evento 'Slot available' recibido para la key: ${cacheKey}`,
    );

    await this.redisClient.delFromCache(cacheKey);
  }
}
