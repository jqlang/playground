import type { Config } from 'next-openapi-gen';

const config: Config = {
  schemaType: 'zod',
  apiDir: 'src/app/api',
  docsConfig: {
    provider: 'swagger',
    title: 'jq Playground API',
    description: 'Execute jq queries and share snippets',
    version: '1.0.0',
  },
};

export default config;
