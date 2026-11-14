import { apiFetch } from './api';

export async function fileToCompressedBase64(
  file: File
): Promise<{ dataBase64: string; mimeType: string }> {
  // SVG or GIF: keep original
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    return { dataBase64: dataUrl, mimeType: file.type };
  }

  // Load into Image and resize if larger than 1600px to keep mobile uploads fast
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  if (file.size <= 900 * 1024) {
    return { dataBase64: dataUrl, mimeType: file.type || 'image/jpeg' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1600;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataBase64: dataUrl, mimeType: file.type || 'image/jpeg' });
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressed = canvas.toDataURL(outType, 0.86);
      resolve({ dataBase64: compressed, mimeType: outType });
    };
    img.onerror = () => {
      resolve({ dataBase64: dataUrl, mimeType: file.type || 'image/jpeg' });
    };
    img.src = dataUrl;
  });
}

export async function uploadImageFile(
  file: File,
  altText?: string,
  folder?: string
): Promise<{ id: number; url: string; filename: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (JPG, PNG, WebP, or SVG).');
  }
  const { dataBase64, mimeType } = await fileToCompressedBase64(file);
  return apiFetch<{ id: number; url: string; filename: string }>('/api/media/upload', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      mimeType,
      dataBase64,
      altText: altText || file.name,
      folder: folder || 'general',
    }),
  });
}
