import { IOpenAttachment } from "@lark-base-open/js-sdk";

export const getBase64FromUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const base64 = canvas.toDataURL('image/png');
      resolve(base64);
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
};


export const generateFileFromUrl = async (url: string, name: string): Promise<File> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type });
};


export const generateFileFromBase64 = (base64: string, name: string): File => {
  const parts = base64.split(';');
  const contentType = parts[0].split(':')[1];
  const raw = parts[1].split(',')[1];
  const bytes = window.atob(raw);
  const buf = new ArrayBuffer(bytes.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new File([buf], name, {type: contentType});
};


export const generateUuidByTime = (): string => {
  const timestamp = Date.now().toString(16);
  const random = (Math.random() * 65535 << 0).toString(16);
  return `${timestamp}-${random}`;
};



export const deepCopy = (obj: any) => {
	return JSON.parse(JSON.stringify(obj));
}



