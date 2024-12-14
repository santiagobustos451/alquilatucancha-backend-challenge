import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisClient } from './redis.client'; // Asegúrate de que esta ruta sea correcta

@Module({
  imports: [ConfigModule],
  providers: [RedisClient],
  exports: [RedisClient], // Asegura que RedisClient se pueda usar fuera de este módulo
})
export class RedisModule {}
