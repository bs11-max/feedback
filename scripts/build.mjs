import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(projectRoot, 'dist');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required.');
}

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  throw new Error('SUPABASE_URL must be a valid URL.');
}

if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('.supabase.co')) {
  throw new Error('SUPABASE_URL must use HTTPS and point to a Supabase project.');
}

if (!supabasePublishableKey.startsWith('sb_publishable_')) {
  throw new Error('SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key.');
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, 'vendor'), { recursive: true });

for (const file of ['index.html', 'styles.css', 'app.js']) {
  await copyFile(resolve(projectRoot, file), resolve(outputDirectory, file));
}

await copyFile(
  resolve(projectRoot, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'),
  resolve(outputDirectory, 'vendor/supabase.js'),
);

const publicConfig = {
  supabaseUrl,
  supabasePublishableKey,
};

await writeFile(
  resolve(outputDirectory, 'config.js'),
  `window.__APP_CONFIG__ = Object.freeze(${JSON.stringify(publicConfig, null, 2)});\n`,
  'utf8',
);

console.log('Built CLASS FEEDBACK in dist/.');

