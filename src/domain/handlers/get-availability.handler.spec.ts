import { Test, TestingModule } from '@nestjs/testing';

import { AlquilaTuCanchaCacheService } from '../cache/alquila-tu-cancha-cache.service';
import { GetAvailabilityQuery } from '../commands/get-availaiblity.query';
import { GetAvailabilityHandler } from '../handlers/get-availability.handler';

const mockAlquilaTuCanchaCacheService = {
  getClubs: jest.fn(),
  getCourts: jest.fn(),
  getAvailableSlots: jest.fn(),
};

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let service: AlquilaTuCanchaCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailabilityHandler,
        {
          provide: AlquilaTuCanchaCacheService,
          useValue: mockAlquilaTuCanchaCacheService,
        },
      ],
    }).compile();

    handler = module.get<GetAvailabilityHandler>(GetAvailabilityHandler);
    service = module.get<AlquilaTuCanchaCacheService>(
      AlquilaTuCanchaCacheService,
    );
  });

  it('should return clubs with availability', async () => {
    // Datos de prueba
    const query = new GetAvailabilityQuery(
      'some-place-id',
      new Date('2024-12-13'),
    );

    const mockClubs = [{ id: 'club1' }, { id: 'club2' }];
    const mockCourts = [{ id: 'court1' }, { id: 'court2' }];
    const mockSlots = [{ slot: '9:00 AM' }, { slot: '10:00 AM' }];

    mockAlquilaTuCanchaCacheService.getClubs.mockResolvedValue(mockClubs);
    mockAlquilaTuCanchaCacheService.getCourts.mockResolvedValue(mockCourts);
    mockAlquilaTuCanchaCacheService.getAvailableSlots.mockResolvedValue(
      mockSlots,
    );

    const result = await handler.execute(query);

    expect(result).toEqual([
      {
        id: 'club1',
        courts: [
          { id: 'court1', available: mockSlots },
          { id: 'court2', available: mockSlots },
        ],
      },
      {
        id: 'club2',
        courts: [
          { id: 'court1', available: mockSlots },
          { id: 'court2', available: mockSlots },
        ],
      },
    ]);

    // Verificar que las funciones del servicio se llamaron correctamente
    expect(service.getClubs).toHaveBeenCalledWith(query.placeId);
    expect(service.getCourts).toHaveBeenCalledTimes(2); // Se llama por cada club
    expect(service.getAvailableSlots).toHaveBeenCalledTimes(4); // Se llama por cada cancha de cada club
  });

  it('should handle errors gracefully', async () => {
    const query = new GetAvailabilityQuery(
      'some-place-id',
      new Date('2024-12-13'),
    );

    // Simular que la llamada a getClubs falla
    mockAlquilaTuCanchaCacheService.getClubs.mockRejectedValue(
      new Error('Service unavailable'),
    );

    // Verificar que se maneja el error correctamente
    await expect(handler.execute(query)).rejects.toThrow('Service unavailable');
  });
});
