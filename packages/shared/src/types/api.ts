export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface AuthUser {
  id: string;
  email: string;
  apiKey: string;
}

export interface LoginDto {
  apiKey: string;
}

export interface TokenPayload {
  userId: string;
  apiKey: string;
}