import { z } from 'zod';

const configSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  OAUTH_REDIRECT_URI: z.url(),
  SECRET_KEY: z.string().min(32, 'SECRET_KEY should be at least 32 characters'),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(44, 'TOKEN_ENCRYPTION_KEY should be a base64 string of 32 bytes'),
  DATABASE_URL: z.url(),
  DB_PROVIDER: z.enum(['neon', 'local']).default('neon'),
  OBSERVE_APP_KEY: z.string().optional(),
  OBSERVE_APP_SECRET: z.string().optional(),
  FRONTEND_URL: z.url().default('http://localhost:3000'),
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Config = z.infer<typeof configSchema>;

export const validateConfig = (config: Record<string, unknown>) => {
  const result = configSchema.safeParse(config);

  if (!result.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(z.treeifyError(result.error), null, 2),
    );
    throw new Error('Invalid environment variables');
  }

  return result.data;
};
