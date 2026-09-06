/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingRoot: new URL("../..", import.meta.url).pathname,
  webpack(config, { isServer }) {
    config.resolve.alias["@"] = new URL("./src/", import.meta.url).pathname;
    config.resolve.extensionAlias = { ...(config.resolve.extensionAlias ?? {}), ".js": [".ts", ".tsx", ".js"], ".jsx": [".tsx", ".jsx"] };
    if (isServer) config.externals = [...(config.externals ?? []), { "better-sqlite3": "commonjs better-sqlite3" }];
    return config;
  },
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: [
    "@kindergarten/contracts",
    "@kindergarten/database",
    "@kindergarten/demo",
    "@kindergarten/mcp-server",
    "@kindergarten/domain",
    "@kindergarten/rendering",
    "@kindergarten/storage"
  ]
};

export default nextConfig;
