import typescript from '@rollup/plugin-typescript'

/**
 * @typedef {import('rollup').RollupOptions} RollupOptions
 * @type {RollupOptions}
 */
export default {
  input: 'index.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
  },
  plugins: [typescript()],
}
