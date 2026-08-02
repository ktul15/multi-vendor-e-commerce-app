export type ApiSuccess<T> = Readonly<{
  success: true;
  message: string;
  data: T;
}>;

export type ApiFieldError = Readonly<{ field?: string; message: string }>;

export type ApiFailure = Readonly<{
  success: false;
  message: string;
  errors?: readonly ApiFieldError[];
}>;
