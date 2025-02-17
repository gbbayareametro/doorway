// dotenv is a dev dependency, so conditionally import it (don't need it in Prod).
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
} catch {
  // Pass
}
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { AppModule } from './modules/app.module';
import { CustomExceptionFilter } from './utilities/custom-exception-filter';
import { json } from 'express';
import { logger } from './middleware/logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn', 'log', 'debug']
        : ['error', 'warn'],
  });
  const allowList = process.env.CORS_ORIGINS || [];
  const allowListRegex = process.env.CORS_REGEX
    ? JSON.parse(process.env.CORS_REGEX)
    : [];
  const regexAllowList = allowListRegex.map((regex) => {
    return new RegExp(regex);
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new CustomExceptionFilter(httpAdapter));
  app.enableCors((req, cb) => {
    const options = {
      credentials: true,
      origin: false,
    };

    if (
      process.env.DISABLE_CORS === 'TRUE' ||
      allowList.indexOf(req.header('Origin')) !== -1 ||
      regexAllowList.some((regex) => regex.test(req.header('Origin')))
    ) {
      options.origin = true;
    }
    cb(null, options);
  });
  app.use(logger);
  app.use(
    cookieParser(),
    compression({
      filter: (_, res) => {
        return res.req.route?.path === '/applications/csv';
      },
    }),
  );
  app.use(json({ limit: '50mb' }));
  const config = new DocumentBuilder()
    .setTitle('Bloom API')
    .setDescription('The API for Bloom')
    .setVersion('2.0')
    .addTag('listings')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  const configService: ConfigService = app.get(ConfigService);

  await app.listen(configService.get<number>('PORT'));
}
bootstrap();
