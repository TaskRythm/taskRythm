import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // so the frontend can call it later
  await app.listen(process.env.PORT || 4000);
  console.log(`🚀  Server running on http://localhost:${process.env.PORT || 4000}`);
}
bootstrap();
