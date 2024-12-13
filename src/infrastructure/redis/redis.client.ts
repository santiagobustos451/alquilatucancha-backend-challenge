/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisClient {
  private redis: Redis;
  private readonly logger = new Logger(RedisClient.name);

  constructor() {
    // Configura la conexión a Redis
    const redisHost: string = process.env.REDIS_HOST || 'redis'; // Usa 'redis' si no se establece otra cosa
    const redisPort: number = parseInt(process.env.REDIS_PORT || '6379'); // Puerto por defecto

    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
    });

    this.redis.on('connect', () => {
      this.logger.log('Conectado a Redis');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Error de Redis:', err);
    });
  }

  // Método para obtener datos del caché
  async getFromCache(key: string): Promise<any> {
    try {
      const data = await this.redis.get(key);
      if (data) {
        this.logger.log(`Cache hit para la clave: ${key}`);
        return JSON.parse(data);
      } else {
        this.logger.log(`Cache miss para la clave: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error('Error al obtener datos del caché:', error);
      return null;
    }
  }

  // Método para almacenar datos en el caché
  async setToCache(key: string, data: any, expiration = 10): Promise<void> {
    try {
      await this.redis.setex(key, expiration, JSON.stringify(data)); // Expiro en 1 hora por defecto
      this.logger.log(`Datos almacenados en el caché con la clave: ${key}`);
    } catch (error) {
      this.logger.error('Error al almacenar datos en el caché:', error);
    }
  }

  // Método para eliminar datos del caché
  async delFromCache(key: string): Promise<void> {
    try {
      if (await this.redis.exists(key)) {
        await this.redis.del(key);
        this.logger.log(`Datos borrados del caché con la clave: ${key}`);
      } else {
        this.logger.log(
          `No se encontraron datos en el caché con la clave: ${key}`,
        );
      }
    } catch (error) {
      this.logger.error('Error al borrar datos del caché:', error);
    }
  }

  // Método para obtener todas las claves que coinciden con un patrón específico
  async keys(pattern: string): Promise<string[]> {
    try {
      const keys = await this.redis.keys(pattern); // Devuelve todas las claves que coinciden con el patrón
      this.logger.log(
        `Se encontraron ${keys.length} claves con el patrón: ${pattern}`,
      );
      return keys;
    } catch (error) {
      this.logger.error('Error al obtener las claves de Redis:', error);
      return [];
    }
  }
}
