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
    const clubs = await this.alquilaTuCanchaCacheService.getClubs(
      query.placeId,
    );

    const clubs_with_availability = await Promise.all(
      clubs.map(async (club) => {
        const courts = await this.alquilaTuCanchaCacheService.getCourts(
          club.id,
        );
        const courts_with_availability = await Promise.all(
          courts.map(async (court) => {
            const slots =
              await this.alquilaTuCanchaCacheService.getAvailableSlots(
                club.id,
                court.id,
                query.date,
              );
            return { ...court, available: slots };
          }),
        );

        return { ...club, courts: courts_with_availability };
      }),
    );

    return clubs_with_availability;
  }
}
