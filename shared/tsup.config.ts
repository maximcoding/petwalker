import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/enums/index.ts',
    'src/types/index.ts',
    'src/dto/index.ts',
    'src/classes/index.ts',
    'src/api/index.ts',
  ],
  format: ['esm', 'cjs'],
  // experimentalDts uses tsc directly instead of rollup-plugin-dts,
  // which handles `.js` extension imports and per-entry types correctly.
  experimentalDts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  tsconfig: './tsconfig.json',
});
