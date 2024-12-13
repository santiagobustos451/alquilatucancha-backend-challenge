import { Test, TestingModule } from '@nestjs/testing';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { AlquilaTuCanchaCacheService } from '../cache/alquila-tu-cancha-cache.service';
import { Slot } from '../model/slot';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

// Mock de RedisClient y AlquilaTuCanchaClient
const mockRedisClient = {
  getFromCache: jest.fn(),
  setToCache: jest.fn(),
};

const mockAlquilaTuCanchaClient = {
  getAvailableSlots: jest.fn(),
};

describe('AlquilaTuCanchaCacheService', () => {
  let service: AlquilaTuCanchaCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlquilaTuCanchaCacheService,
        { provide: RedisClient, useValue: mockRedisClient },
        {
          provide: ALQUILA_TU_CANCHA_CLIENT,
          useValue: mockAlquilaTuCanchaClient,
        },
      ],
    }).compile();

    service = module.get<AlquilaTuCanchaCacheService>(
      AlquilaTuCanchaCacheService,
    );
  });

  describe('getAvailableSlots', () => {
    it('should return slots from cache if available', async () => {
      const mockSlots: Slot[] = [
        {
          price: 10,
          duration: 60,
          datetime: '2024-12-13T09:00:00Z',
          start: '09:00 AM',
          end: '10:00 AM',
          _priority: 1,
        },
      ];
      mockRedisClient.getFromCache.mockResolvedValue(mockSlots);

      const result = await service.getAvailableSlots(
        1,
        1,
        new Date('2024-12-13'),
      );
      expect(result).toEqual(mockSlots);
      expect(mockRedisClient.getFromCache).toHaveBeenCalledWith(
        'slots:1:1:2024-12-13',
      );
      expect(
        mockAlquilaTuCanchaClient.getAvailableSlots,
      ).not.toHaveBeenCalled();
    });

    it('should return slots from API if not in cache', async () => {
      const mockSlots: Slot[] = [
        {
          price: 10,
          duration: 60,
          datetime: '2024-12-13T09:00:00Z',
          start: '09:00 AM',
          end: '10:00 AM',
          _priority: 1,
        },
      ];
      mockRedisClient.getFromCache.mockResolvedValue(null); // Simulamos que no hay en caché
      mockAlquilaTuCanchaClient.getAvailableSlots.mockResolvedValue(mockSlots);

      const result = await service.getAvailableSlots(
        1,
        1,
        new Date('2024-12-13'),
      );
      expect(result).toEqual(mockSlots);
      expect(mockRedisClient.getFromCache).toHaveBeenCalledWith(
        'slots:1:1:2024-12-13',
      );
      expect(mockAlquilaTuCanchaClient.getAvailableSlots).toHaveBeenCalledWith(
        1,
        1,
        new Date('2024-12-13'),
      );
      expect(mockRedisClient.setToCache).toHaveBeenCalledWith(
        'slots:1:1:2024-12-13',
        mockSlots,
        300,
      );
    });
  });
});
