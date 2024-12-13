import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { SlotBookedEvent } from '../events/slot-booked.event';

@EventsHandler(SlotBookedEvent)
export class SlotBookedHandler implements IEventHandler<SlotBookedEvent> {
  private readonly logger = new Logger(SlotBookedHandler.name);

  constructor(private readonly redisClient: RedisClient) {}

  async handle(event: SlotBookedEvent) {
    const cacheKey = `slots:${event.clubId}:${event.courtId}:${moment(
      event.slot.datetime,
    ).format('YYYY-MM-DD')}`;
    this.logger.log(`Evento 'Slot booked' recibido para la key: ${cacheKey}`);

    await this.redisClient.delFromCache(cacheKey);
  }
}
