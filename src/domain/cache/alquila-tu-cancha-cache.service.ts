import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

interface CacheService {
  redis: RedisClient;
  alquilaTuCanchaClient: AlquilaTuCanchaClient;
}

@Injectable()
export class AlquilaTuCanchaCacheService implements CacheService {
  redis: RedisClient;
  alquilaTuCanchaClient: AlquilaTuCanchaClient;
  DEFAULT_TTL: number;
  SLOTS_TTL: number;

  constructor(
    redis: RedisClient,
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    alquilaTuCanchaClient: AlquilaTuCanchaClient,
    private readonly configService: ConfigService,
  ) {
    this.redis = redis;
    this.alquilaTuCanchaClient = alquilaTuCanchaClient;

    // Obtener valores de configuración desde ConfigService
    this.DEFAULT_TTL = parseInt(
      this.configService.get<string>('DEFAULT_TTL', '3600'),
    );
    this.SLOTS_TTL = parseInt(
      this.configService.get<string>('SLOTS_TTL', '300'),
    );
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const indexCacheKey = `clubsInPlace-${placeId}`;
    const cachedData = await this.redis.getFromCache(indexCacheKey);

    if (cachedData) {
      const clubs: Club[] = await Promise.all(
        cachedData.map(async (clubId: number) => {
          const clubCacheKey = `club-${clubId}`;
          const cachedClub = await this.redis.getFromCache(clubCacheKey);
          if (cachedClub) {
            return cachedClub;
          }

          const club = await this.alquilaTuCanchaClient.getClubById(clubId);
          await this.redis.setToCache(clubCacheKey, club, this.DEFAULT_TTL);
          return club;
        }),
      );

      return clubs;
    }

    console.time(`Fetching clubs for place ${placeId}`);
    const clubs = await this.alquilaTuCanchaClient.getClubs(placeId);
    console.timeEnd(`Fetching clubs for place ${placeId}`);

    const clubIds = clubs.map((club: Club) => club.id);
    this.redis.setToCache(indexCacheKey, clubIds, this.DEFAULT_TTL);

    Promise.all(
      clubs.map((club: Club) =>
        this.redis.setToCache(`club-${club.id}`, club, this.DEFAULT_TTL),
      ),
    );

    return clubs;
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const cacheKey = `courts-${clubId}`;
    const cachedData = await this.redis.getFromCache(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    console.time(`Fetching courts for club ${clubId}`);
    const courts = await this.alquilaTuCanchaClient.getCourts(clubId);
    console.timeEnd(`Fetching courts for club ${clubId}`);

    await this.redis.setToCache(cacheKey, courts, this.DEFAULT_TTL);
    return courts;
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const cacheKey = `slots:${clubId}:${courtId}:${
      date.toISOString().split('T')[0]
    }`;
    const cachedData = await this.redis.getFromCache(cacheKey);

    if (cachedData) {
      return cachedData;
    }

    console.time(`Fetching slots for club ${clubId} in court ${courtId}`);
    const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
      clubId,
      courtId,
      date,
    );
    console.timeEnd(`Fetching slots for club ${clubId} in court ${courtId}`);

    await this.redis.setToCache(cacheKey, slots, this.SLOTS_TTL);
    return slots;
  }
}
