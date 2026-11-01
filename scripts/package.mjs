/**
 * 打包 VSIX：按 package.json 的包名与版本拼出产物路径，交给 vsce 输出到 releases/。
 * 复用约定：由 pnpm run package 调用，node_modules/.bin 已在 PATH 中，可直接执行 vsce。
 * 注意：输出目录必须先建立，且 --out 传完整文件名——vsce 在目标目录缺失时会把 "releases/"
 * 当成文件名，生成一个名为 releases 的 vsix 文件，后续按目录查找产物就会全部落空。
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const outDir = join(ROOT, 'releases')
const vsix = join(outDir, `${manifest.name}-${manifest.version}.vsix`)

mkdirSync(outDir, { recursive: true })
execSync(`vsce package --no-dependencies --out "${vsix}"`, { cwd: ROOT, stdio: 'inherit' })

console.log(`✓ 已生成 ${relative(ROOT, vsix)}`)
