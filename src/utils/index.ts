import { UNKNOWN_ERROR } from '../consts';

export const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : UNKNOWN_ERROR;