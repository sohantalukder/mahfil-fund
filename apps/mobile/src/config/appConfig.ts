const appConfig = {
  api: {
    baseUrl: process.env.API_URL ?? 'http://localhost:4000',
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  },
};

export default appConfig;
