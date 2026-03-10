import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mahfil/api-sdk", "@mahfil/i18n", "@mahfil/theme", "@mahfil/types", "@mahfil/utils", "@mahfil/schemas"],
};

export default nextConfig;
