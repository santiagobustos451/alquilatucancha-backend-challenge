import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../../domain/ports/aquila-tu-cancha.client';
import { AlquilaTuCanchaCacheService } from './alquila-tu-cancha-cache.service';

@Injectable()
export class PrecacheService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PrecacheService.name);

  constructor(
    private alquilaTuCanchaCacheService: AlquilaTuCanchaCacheService,
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
  ) {}

  // Precalentado del caché en el inicio de la aplicación
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Comenzando precarga del cache');
    await this.precache();
    this.logger.log(`Precarga del cache terminada`);
  }

  // Lógica de precalentado
  async precache(): Promise<void> {
    try {
      console.time('precache');
      const zones = await this.alquilaTuCanchaClient.getZones();

      await Promise.all(
        zones.map(async (zone) => {
          const clubs = await this.alquilaTuCanchaCacheService.getClubs(
            zone.placeid,
          );

          await Promise.all(
            clubs.map(async (club) => {
              await this.alquilaTuCanchaCacheService.getCourts(club.id);
            }),
          );
        }),
      );

      console.timeEnd('precache');
    } catch (error) {
      this.logger.error('Error durante precarga del cache', error);
    }
  }
}
