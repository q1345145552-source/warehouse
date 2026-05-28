import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'warehouse-management' },
      transports: [
        // 控制台输出
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        // 错误日志文件
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // 所有日志文件
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  log(message: string, ...optionalParams: unknown[]) {
    this.logger.info(message, { metadata: optionalParams });
  }

  error(message: string, ...optionalParams: unknown[]) {
    this.logger.error(message, { metadata: optionalParams });
  }

  warn(message: string, ...optionalParams: unknown[]) {
    this.logger.warn(message, { metadata: optionalParams });
  }

  debug(message: string, ...optionalParams: unknown[]) {
    this.logger.debug(message, { metadata: optionalParams });
  }

  verbose(message: string, ...optionalParams: unknown[]) {
    this.logger.verbose(message, { metadata: optionalParams });
  }

  // 业务日志方法
  logBusiness(module: string, action: string, data: Record<string, unknown>, userId?: string) {
    this.logger.info('Business operation', {
      module,
      action,
      data,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  // 安全日志方法
  logSecurity(event: string, data: Record<string, unknown>, userId?: string) {
    this.logger.warn('Security event', {
      event,
      data,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  // 性能日志方法
  logPerformance(operation: string, duration: number, data?: Record<string, unknown>) {
    this.logger.info('Performance metric', {
      operation,
      duration,
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
