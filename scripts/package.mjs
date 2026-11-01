/**
 * 打包 VSIX 并安装到本机：按 package.json 的包名与版本拼出产物路径，交给 vsce 输出到 releases/，
 * 成功后调用 code CLI 覆盖安装，省掉 README 里那条手动安装命令。
 * 复用约定：由 pnpm run package 调用，node_modules/.bin 已在 PATH 中，可直接执行 vsce。
 * 注意：输出目录必须先建立，且 --out 传完整文件名——vsce 在目标目录缺失时会把 "releases/"
 * 当成文件名，生成一个名为 releases 的 vsix 文件，后续按目录查找产物就会全部落空；
 * 同版本重装必须带 --force，否则 code CLI 判定「已安装」后直接返回、并不覆盖；
 * code 不可用（CI、未装 CLI）只提示不改变退出码，避免已产出的 vsix 被误判成打包失败；
 * 发布流程只取产物，用 --no-install 跳过安装这一步。
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const outDir = join(ROOT, 'releases')
const vsix = join(outDir, `${manifest.name}-${manifest.version}.vsix`)
const shouldInstall = !process.argv.includes('--no-install')

mkdirSync(outDir, { recursive: true })
execSync(`vsce package --no-dependencies --out "${vsix}"`, { cwd: ROOT, stdio: 'inherit' })

console.log(`✓ 已生成 ${relative(ROOT, vsix)}`)

if (shouldInstall) {
    try {
        execSync(`code --install-extension "${vsix}" --force`, { cwd: ROOT, stdio: 'inherit' })
        console.log('✓ 已安装到本机，重载窗口后生效')
    } catch {
        console.log(`⚠ 自动安装失败，请手动执行：code --install-extension ${relative(ROOT, vsix)}`)
    }
}
