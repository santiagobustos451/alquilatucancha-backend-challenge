import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { RedisClient } from '../../infrastructure/redis/redis.client';
import { ClubUpdatedEvent } from '../events/club-updated.event';
import { ClubUpdatedHandler } from '../handlers/club-updated.handler';
import { ALQUILA_TU_CANCHA_CLIENT } from '../ports/aquila-tu-cancha.client';

// Mock de RedisClient y AlquilaTuCanchaClient
const mockRedisClient = {
  delFromCache: jest.fn(),
  setToCache: jest.fn(),
  keys: jest.fn(),
};

const mockAlquilaTuCanchaClient = {
  getClubById: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'DEFAULT_TTL') {
      return '3600'; // Valor de TTL simulado (1 hora)
    }
    return null;
  }),
};

describe('ClubUpdatedHandler', () => {
  let handler: ClubUpdatedHandler;
  const event: ClubUpdatedEvent = {
    clubId: 1,
    fields: ['openhours'], // Simulamos que 'openhours' es uno de los campos actualizados
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClubUpdatedHandler,
        { provide: RedisClient, useValue: mockRedisClient },
        {
          provide: ALQUILA_TU_CANCHA_CLIENT,
          useValue: mockAlquilaTuCanchaClient,
        },
        { provide: ConfigService, useValue: mockConfigService },
        Logger,
      ],
    }).compile();

    handler = module.get<ClubUpdatedHandler>(ClubUpdatedHandler);
  });

  it('should update the club in the cache and clear related slots', async () => {
    const mockUpdatedClub = { id: 1, name: 'Updated Club' }; // Club simulado
    const ttl = parseInt(mockConfigService.get('DEFAULT_TTL'), 10); // Obtenemos el TTL

    // Simula la respuesta de la API
    mockAlquilaTuCanchaClient.getClubById.mockResolvedValue(mockUpdatedClub);
    // Simula la respuesta de los slots en Redis
    mockRedisClient.keys.mockResolvedValue([
      'slots:1:1:2024-12-13',
      'slots:1:2:2024-12-13',
    ]);

    // Llamamos al handler
    await handler.handle(event);

    // Verificaciones
    expect(mockRedisClient.delFromCache).toHaveBeenCalledWith('club-1');
    expect(mockAlquilaTuCanchaClient.getClubById).toHaveBeenCalledWith(1);
    expect(mockRedisClient.setToCache).toHaveBeenCalledWith(
      'club-1',
      mockUpdatedClub,
      ttl, // Verificamos que use el TTL obtenido del mock
    );
    expect(mockRedisClient.keys).toHaveBeenCalledWith('slots:1:*');
    expect(mockRedisClient.delFromCache).toHaveBeenCalledWith(
      'slots:1:1:2024-12-13',
    );
    expect(mockRedisClient.delFromCache).toHaveBeenCalledWith(
      'slots:1:2:2024-12-13',
    );
  });

  it('should not clear slots if openhours field is not updated', async () => {
    const eventWithoutOpenhours: ClubUpdatedEvent = {
      clubId: 1,
      fields: ['attributes'], // Simulamos que no se actualizó 'openhours'
    };

    mockAlquilaTuCanchaClient.getClubById.mockResolvedValue({
      id: 1,
      name: 'Updated Club',
    });
    mockRedisClient.keys.mockResolvedValue([]); // Aseguramos que no hay slots que eliminar

    await handler.handle(eventWithoutOpenhours);

    // Verificamos que no se borren los slots si no se actualizó 'openhours'
    expect(mockRedisClient.delFromCache).not.toHaveBeenCalledWith(
      'slots:1:1:2024-12-13',
    );
    expect(mockRedisClient.delFromCache).not.toHaveBeenCalledWith(
      'slots:1:2:2024-12-13',
    );
  });

  it('should log an error if there is an issue updating the club', async () => {
    const error = new Error('API Error');
    mockAlquilaTuCanchaClient.getClubById.mockRejectedValue(error);

    // Es necesario espiar el logger
    const logErrorSpy = jest.spyOn(Logger.prototype, 'error');

    await handler.handle(event);

    expect(logErrorSpy).toHaveBeenCalledWith(
      `Error al actualizar el club con ID 1 | ${JSON.stringify(error)}`,
    );
  });
});
