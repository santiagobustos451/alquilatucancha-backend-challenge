import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AlquilaTuCanchaCacheService } from '../cache/alquila-tu-cancha-cache.service';
import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    private alquilaTuCanchaCacheService: AlquilaTuCanchaCacheService,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const clubs_with_availability: ClubWithAvailability[] = [];

    const clubs = await this.alquilaTuCanchaCacheService.getClubs(
      query.placeId,
    );

    for (const club of clubs) {
      const courts = await this.alquilaTuCanchaCacheService.getCourts(club.id);
      const courts_with_availability: ClubWithAvailability['courts'] = [];
      for (const court of courts) {
        const slots = await this.alquilaTuCanchaCacheService.getAvailableSlots(
          club.id,
          court.id,
          query.date,
        );
        courts_with_availability.push({
          ...court,
          available: slots,
        });
      }
      clubs_with_availability.push({
        ...club,
        courts: courts_with_availability,
      });
    }
    return clubs_with_availability;
  }
}
