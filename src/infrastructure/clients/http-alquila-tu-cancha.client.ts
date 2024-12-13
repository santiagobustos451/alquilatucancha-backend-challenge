import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { RedisClient } from '../redis/redis.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  private readonly logger = new Logger(HTTPAlquilaTuCanchaClient.name);
  constructor(
    private httpService: HttpService,
    config: ConfigService,
    private redis: RedisClient,
  ) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  async getClubs(placeId: string): Promise<Club[]> {
    return this.httpService.axiosRef
      .get('clubs', {
        baseURL: this.base_url,
        params: { placeId },
      })
      .then((res) => res.data);
  }

  async getCourts(clubId: number): Promise<Court[]> {
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts`, {
        baseURL: this.base_url,
      })
      .then((res) => res.data);
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
        baseURL: this.base_url,
        params: { date: moment(date).format('YYYY-MM-DD') },
      })
      .then((res) => res.data);
  }

  async getClubById(clubId: number): Promise<Club> {
    return this.httpService.axiosRef
      .get(`/clubs/${clubId}`, { baseURL: this.base_url })
      .then((res) => res.data);
  }
}
