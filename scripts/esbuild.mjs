/**
 * 扩展宿主构建脚本。
 * 把 src/extension 下的 TypeScript 源码打包为 CommonJS 单文件 dist/extension.js，
 * 并将 vscode 模块保留为外部依赖（由扩展宿主在运行时注入）。
 * 所有输入输出路径均以项目根为基准（用 absWorkingDir 锚定），脚本位于 scripts/ 子目录也不会受调用位置影响。
 * 注意：产物必须落在 dist/ 根目录并与 package.json 的 main 保持一致；sourcemap 仅在 watch 模式开启。
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    absWorkingDir: projectRoot,
    entryPoints: ['src/extension/extension.ts'],
    bundle: true,
    outfile: 'dist/extension.js',
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    external: ['vscode'],
    sourcemap: isWatch,
    minify: !isWatch,
    logLevel: 'info',
};

if (isWatch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('[esbuild] watching extension host ...');
} else {
    await build(buildOptions);
}
