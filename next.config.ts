import type { NextConfig } from 'next';

// Runs before Next builds or serves the application, including direct `next build`.
const { assertEnvironmentIsolation } = require('./scripts/environment-isolation.cjs');
assertEnvironmentIsolation();

const config: NextConfig = {};
export default config;
