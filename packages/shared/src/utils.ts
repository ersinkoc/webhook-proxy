export function generateSlug(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toISOString();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function parseHeaders(headers: any): Record<string, string> {
  const parsed: Record<string, string> = {};
  
  if (typeof headers === 'object' && headers !== null) {
    Object.keys(headers).forEach((key) => {
      const value = headers[key];
      if (typeof value === 'string') {
        parsed[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        parsed[key.toLowerCase()] = value.join(', ');
      }
    });
  }
  
  return parsed;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}