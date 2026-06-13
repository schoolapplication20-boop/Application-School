export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => (
  error?.response?.data?.message || fallback
);

export const getErrorCode = (error) => error?.response?.data?.error || null;
