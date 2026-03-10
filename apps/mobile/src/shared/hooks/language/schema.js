import { z } from 'zod';
export const languageSchema = z.enum([
    "en-EN" /* SupportedLanguages.EN_EN */,
    "bn-BN" /* SupportedLanguages.BN_BN */,
]);
