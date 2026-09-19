import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../environments/environment';
import { StoredFile } from './models';

/**
 * Хранилище файлов (фото, чеки, пользовательские GLB) на Supabase Storage.
 * Бакет публичный: чтение — по public URL, пути содержат uid и id авто.
 * Firebase Storage не используется (требует план Blaze).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly client: SupabaseClient;
  private readonly bucket = environment.supabase.bucket;

  constructor() {
    const { url, anonKey } = environment.supabase;
    if (!url || !anonKey) {
      console.warn(
        'storage: Supabase не настроен (src/environments/environment.ts) — загрузка файлов не будет работать',
      );
    }
    this.client = createClient(url || 'http://localhost', anonKey || 'not-configured');
  }

  /** Загружает файл в бакет и возвращает ссылку для записи в Firestore. */
  async uploadFile(path: string, file: Blob, contentType?: string): Promise<StoredFile> {
    const { error } = await this.client.storage.from(this.bucket).upload(path, file, {
      contentType,
      upsert: true,
    });
    if (error) {
      throw error;
    }
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return { url: data.publicUrl, path, createdAt: Timestamp.now() };
  }

  /** Удаляет файл; ошибка удаления (например, файл из старого хранилища) не роняет операцию. */
  async deleteFile(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) {
      console.warn(`storage: не удалось удалить ${path}`, error.message);
    }
  }

  /**
   * Сжимает изображение на клиенте (canvas → JPEG), чтобы не заливать
   * многомегабайтные фото с телефона. GIF и мелкие файлы отдаёт как есть.
   */
  async compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') {
      return file;
    }
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 500_000) {
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality),
    );
  }
}
