import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes, deleteObject } from '@angular/fire/storage';

import { StoredFile } from './models';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(Storage);

  /** Загружает файл в Storage и возвращает ссылку для записи в Firestore. */
  async uploadFile(path: string, file: Blob, contentType?: string): Promise<StoredFile> {
    const fileRef = ref(this.storage, path);
    await uploadBytes(fileRef, file, contentType ? { contentType } : undefined);
    const url = await getDownloadURL(fileRef);
    return { url, path, createdAt: Timestamp.now() };
  }

  /** Удаляет файл; отсутствие файла ошибкой не считается. */
  async deleteFile(path: string): Promise<void> {
    try {
      await deleteObject(ref(this.storage, path));
    } catch (error) {
      if ((error as { code?: string }).code !== 'storage/object-not-found') {
        throw error;
      }
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
