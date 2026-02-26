import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../providers/redis.provider';

export const InjectRedis = () => Inject(REDIS_CLIENT);
