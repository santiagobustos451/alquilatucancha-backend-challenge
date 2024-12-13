import { Logger } from '@nestjs/common';

import { CourtUpdatedEvent } from '../events/court-updated.event';
import { CourtUpdatedHandler } from '../handlers/court-updated.handler';

// Mock de RedisClient y AlquilaTuCanchaClient
const mockRedisClient = {
  delFromCache: jest.fn(),
};

const mockAlquilaTuCanchaClient = {
  getCourts: jest.fn(),
};

describe('CourtUpdatedHandler', () => {
  let handler: CourtUpdatedHandler;

  beforeEach(() => {
    jest.clearAllMocks(); // Limpia los mocks antes de cada prueba
    handler = new CourtUpdatedHandler(
      mockRedisClient as any,
      mockAlquilaTuCanchaClient as any,
    );
  });

  it('should clear courts cache and update courts data', async () => {
    const event: CourtUpdatedEvent = {
      clubId: 1,
      courtId: 2,
      fields: ['name', 'attributes'], // campos actualizados
    };

    mockAlquilaTuCanchaClient.getCourts.mockResolvedValue([
      { id: 2, name: 'Court 2', surface: 'Clay' },
    ]);

    // Ejecutar el handler
    await handler.handle(event);

    // Verificar que se haya borrado el cache de las canchas
    expect(mockRedisClient.delFromCache).toHaveBeenCalledWith('courts-1');

    // Verificar que los datos de las canchas hayan sido actualizados desde el cliente HTTP
    expect(mockAlquilaTuCanchaClient.getCourts).toHaveBeenCalledWith(1);
  });

  it('should log an error if there is an exception when updating courts', async () => {
    const event: CourtUpdatedEvent = {
      clubId: 1,
      courtId: 2,
      fields: ['name'],
    };

    const error = new Error('API Error');
    mockAlquilaTuCanchaClient.getCourts.mockRejectedValue(error);

    // Spying on the logger
    const loggerSpy = jest.spyOn(Logger.prototype, 'error');

    await handler.handle(event);

    // Verificar que el error se haya registrado
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Error al actualizar las canchas del club con ID 1`,
      ),
    );

    // Limpiar el espía después de la prueba
    loggerSpy.mockRestore();
  });
});
