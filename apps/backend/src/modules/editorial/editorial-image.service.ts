import { BadRequestException, Injectable } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

type ImageTemplate = {
  width?: number;
  height?: number;
  label: string;
};

const IMAGE_TEMPLATES: Record<string, ImageTemplate> = {
  square: { width: 1080, height: 1080, label: 'Квадрат 1:1' },
  portrait: { width: 1080, height: 1350, label: 'Вертикальный 4:5' },
  landscape: { width: 1280, height: 720, label: 'Горизонтальный 16:9' },
  story: { width: 1080, height: 1920, label: 'История 9:16' },
  original: { label: 'Оригинал' },
};

const SUPPORTED_FORMATS = new Set([
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'tiff',
  'heif',
]);

@Injectable()
export class EditorialImageService {
  async uploadImage(file: Express.Multer.File | undefined, templateKey: string) {
    if (!file) throw new BadRequestException('Файл изображения не получен');
    if (!file.buffer?.length) throw new BadRequestException('Получен пустой файл изображения');

    const template = IMAGE_TEMPLATES[templateKey];
    if (!template) {
      throw new BadRequestException(`Неизвестный шаблон изображения: ${templateKey}`);
    }

    try {
      const metadata = await sharp(file.buffer, {
        animated: false,
        failOn: 'none',
      }).metadata();

      if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format)) {
        throw new BadRequestException(
          `Формат файла «${file.originalname}» не поддерживается. Используйте JPEG, PNG, WebP, AVIF, GIF, TIFF или HEIC/HEIF.`,
        );
      }
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException(`Не удалось определить размер изображения «${file.originalname}»`);
      }

      const outputDir = join(process.cwd(), 'uploads', 'editorial');
      await mkdir(outputDir, { recursive: true });
      const filename = `${Date.now()}-${uuidv4()}.jpg`;
      const outputPath = join(outputDir, filename);

      let pipeline = sharp(file.buffer, {
        animated: false,
        failOn: 'none',
      })
        .rotate()
        .flatten({ background: '#ffffff' });

      if (template.width && template.height) {
        pipeline = pipeline.resize(template.width, template.height, {
          fit: 'contain',
          position: 'centre',
          background: '#ffffff',
          withoutEnlargement: false,
        });
      }

      const info = await pipeline
        .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toFile(outputPath);

      const relativeUrl = `/uploads/editorial/${filename}`;
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ab-event.pro').replace(/\/$/, '');

      return {
        url: `${siteUrl}${relativeUrl}`,
        relativeUrl,
        template: templateKey,
        templateLabel: template.label,
        width: info.width,
        height: info.height,
        size: info.size,
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,
        sourceFormat: metadata.format,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(
        `Не удалось обработать изображение «${file.originalname}». Попробуйте сохранить его как JPEG/PNG/WebP или выбрать другой файл. Причина: ${message}`,
      );
    }
  }
}
