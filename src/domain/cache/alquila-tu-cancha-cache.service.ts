import { Inject, Injectable } from '@nestjs/common';

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
  constructor(
    redis: RedisClient,
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    alquilaTuCanchaClient: AlquilaTuCanchaClient,
  ) {
    this.redis = redis;
    this.alquilaTuCanchaClient = alquilaTuCanchaClient;
  }

  DEFAULT_TTL = parseInt(process.env.DEFAULT_TTL || '3600');
  SLOTS_TTL = parseInt(process.env.SLOTS_TTL || '300');

  async getClubs(placeId: string): Promise<Club[]> {
    // Key for the index of clubs in this placeId
    const indexCacheKey = `clubsInPlace-${placeId}`;

    const cachedData = await this.redis.getFromCache(indexCacheKey);
    //if there is an index for this place
    if (cachedData) {
      const clubs: Club[] = await Promise.all(
        cachedData.map(async (clubId: number) => {
          const clubCacheKey = `club-${clubId}`;
          // Try to fetch the club from the cache
          const cachedClub = await this.redis.getFromCache(clubCacheKey);
          if (cachedClub) {
            return cachedClub;
          }

          // If not in the cache, fetch from the API
          const club = await this.alquilaTuCanchaClient.getClubById(clubId);

          // Cache the fetched club
          await this.redis.setToCache(clubCacheKey, club, this.DEFAULT_TTL);
          return club;
        }),
      );

      return clubs;
    }

    // Else, get the whole list

    const clubs = await this.alquilaTuCanchaClient.getClubs(placeId);

    // Create an array of club IDs
    const clubIds = clubs.map((club: Club) => club.id);

    // Cache the index of club IDs
    this.redis.setToCache(indexCacheKey, clubIds, this.DEFAULT_TTL);

    // Cache each club separately
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

    const courts = await this.alquilaTuCanchaClient.getCourts(clubId);
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

    const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
      clubId,
      courtId,
      date,
    );
    await this.redis.setToCache(cacheKey, slots, this.SLOTS_TTL);
    return slots;
  }
}
