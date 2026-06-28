import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

const allowedOrigins = [process.env.FRONTEND_URL, process.env.PATIENT_PORTAL_URL]
  .filter(Boolean)
  .map((origin) => origin!.replace(/\/$/, '')) as string[];

function isAllowedOrigin(origin: string) {
  const normalized = origin.replace(/\/$/, '');

  if (
    /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(normalized) ||
    /^https?:\/\/\[::1\](:\d+)?$/i.test(normalized)
  ) {
    return true;
  }

  return allowedOrigins.includes(normalized);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
