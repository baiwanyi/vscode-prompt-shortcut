/**
 * 发布到 GitHub Release：整理提交记录、打包 vsix、推送 tag，再调用 gh 创建带附件的 Release。
 * 用 Node 脚本而非 npm script 串联，避免 cmd 与 bash 对 $npm_package_version 的展开差异；
 * 发布前校验工作区是否干净、tag 是否指向 HEAD、Release 是否已存在，防止把未提交的代码打进包或覆盖已有版本。
 * 注意：需要先完成 gh auth login；脚本不会改 update.json，发布后要手动同步版本号。
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReleaseNotes } from './release-notes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ALLOW_DIRTY = process.argv.includes('--allow-dirty')

/** 执行并继承输出：打包与 gh 的日志要原样透给用户 */
function run(command) {
    execSync(command, { cwd: ROOT, stdio: 'inherit' })
}

/** 执行并取回 stdout，只用于 git 状态这类只读查询 */
function capture(command) {
    return execSync(command, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** 失败即退出：发布流程中途停下，比带着半成品继续安全 */
function fail(message) {
    console.error(`✗ ${message}`)
    process.exit(1)
}

/** 上一个 tag：按版本倒序取第一个非当前 tag，没有就返回空串（表示取全部历史） */
function findPreviousTag(currentTag) {
    const tags = capture('git tag --sort=-v:refname')
        .split(/\r?\n/u)
        .filter((item) => item && item !== currentTag)
    return tags[0] ?? ''
}

/** 收集区间内的提交标题，交由 release-notes 分组 */
function collectSubjects(previousTag, currentTag) {
    const range = previousTag ? `${previousTag}..${currentTag}` : currentTag
    return capture(`git log ${range} --pretty=format:%s`).split(/\r?\n/u)
}

const manifest = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const version = typeof manifest.version === 'string' ? manifest.version : ''
if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    fail(`package.json 的 version 不是 x.y.z：${version || '(空)'}`)
}

const tag = `v${version}`
const vsix = join('releases', `${manifest.name}-${version}.vsix`)

const dirty = capture('git status --porcelain')
if (dirty && !ALLOW_DIRTY) {
    fail(`工作区有未提交的改动，先提交，或加 --allow-dirty 跳过检查：\n${dirty}`)
}

const headCommit = capture('git rev-parse HEAD')
const tagExists = Boolean(capture(`git tag --list ${tag}`))
// tag 已存在时只允许指向当前 HEAD：否则发布会把旧提交打包进新版本
if (tagExists && capture(`git rev-parse ${tag}`) !== headCommit) {
    fail(`tag ${tag} 已存在但不指向当前 HEAD，先删掉旧 tag 或升版本号`)
}

try {
    capture('gh auth status')
} catch {
    fail('gh 未认证，先执行 gh auth login')
}

try {
    capture(`gh release view ${tag}`)
    fail(`Release ${tag} 已存在，如需替换先执行 gh release delete ${tag}`)
} catch {
    // 查不到即为预期状态：该 tag 还没有 Release
}

const branch = capture('git rev-parse --abbrev-ref HEAD')
if (branch !== 'main') {
    console.warn(`! 当前分支是 ${branch}，tag 会打在这个分支的 HEAD 上`)
}

console.log(`→ 打包 ${tag}`)
run('pnpm run package')
if (!existsSync(join(ROOT, vsix))) {
    fail(`没有生成 ${vsix}，检查 vsce package 的输出`)
}

console.log(`→ 推送分支与 tag`)
run(`git push origin ${branch}`)
if (!tagExists) {
    run(`git tag ${tag}`)
}
run(`git push origin ${tag}`)

const previousTag = findPreviousTag(tag)
const notes = buildReleaseNotes(collectSubjects(previousTag, tag))
const notesPath = join(tmpdir(), `vscode-prompt-shortcut-release-notes-${version}.md`)
if (notes) {
    writeFileSync(notesPath, notes, 'utf8')
}

console.log(`→ 创建 GitHub Release ${tag}`)
try {
    // 有整理好的正文就用文件传入，避免长文本与引号在命令行里转义出错；空历史时退回 GitHub 自动生成
    run(
        `gh release create ${tag} "${vsix}" --title "${tag}" ${notes ? `--notes-file "${notesPath}"` : '--generate-notes'}`,
    )
} finally {
    if (notes) {
        unlinkSync(notesPath)
    }
}

console.log(`\n✓ 已发布 ${tag}`)
console.log(`下一步：把 update.json 的 version 改为 ${version} 并提交，url 保持 releases/latest 即可。`)
