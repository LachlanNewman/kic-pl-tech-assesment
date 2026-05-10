import pino from 'pino'

const logger = pino(
  process.env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true },
        },
        level: 'debug',
      }
    : {
        level: process.env.LOG_LEVEL ?? 'info',
      }
)

export default logger
