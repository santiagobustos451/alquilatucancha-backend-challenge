import { Module } from '@nestjs/common';

import { RedisClient } from './redis.client'; // Asegúrate de que esta ruta sea correcta

@Module({
  providers: [RedisClient],
  exports: [RedisClient], // Asegura que RedisClient se pueda usar fuera de este módulo
})
export class RedisModule {}
