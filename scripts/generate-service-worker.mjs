import { generateSW } from 'workbox-build';

const maxPrecacheFileSize = 10 * 1024 * 1024;

const result = await generateSW({
  cacheId: 'pocket-diary',
  cleanupOutdatedCaches: true,
  clientsClaim: false,
  globDirectory: 'dist',
  globIgnores: ['sw.js', 'workbox-*.js'],
  globPatterns: [
    '**/*.{html,js,css,json,ico,png,svg,webp,woff,woff2,ttf,webmanifest}',
  ],
  maximumFileSizeToCacheInBytes: maxPrecacheFileSize,
  navigateFallback: '/index.html',
  mode: 'production',
  skipWaiting: false,
  sourcemap: false,
  swDest: 'dist/sw.js',
});

if (result.warnings.length > 0) {
  throw new Error(`서비스 워커 생성 경고:\n${result.warnings.join('\n')}`);
}

console.log(
  `Pocket Diary offline cache: ${result.count} files, ${result.size} bytes`,
);
