// Обёртка над внешним `rclone` (docs/architecture.md §9). Раннер команд — инъектируемый,
// чтобы логика push/restore тестировалась моком, а реальные вызовы шли через Bun.spawn.
// VACUUM INTO делается напрямую через bun:sqlite (push.ts) — это не внешняя команда.

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

/** Инъектируемый раннер внешних команд. В тестах — мок; в проде — createCommandRunner(). */
export type CommandRunner = (argv: readonly string[]) => Promise<CommandResult>

/** Реальный раннер поверх Bun.spawn: захватывает stdout/stderr и код выхода. */
export function createCommandRunner(): CommandRunner {
  return async (argv) => {
    const proc = Bun.spawn(argv as string[], { stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ])
    const exitCode = await proc.exited
    return { exitCode, stdout, stderr }
  }
}

/** Узкий интерфейс rclone для push/restore (только нужные подкоманды). */
export interface Rclone {
  /** Инкрементальное зеркалирование каталога/бакета `src` → `dst`. */
  sync(src: string, dst: string): Promise<void>
  /** Копирование одного объекта `src` → `dst` (перезапись). */
  copyto(src: string, dst: string): Promise<void>
  /** Список имён файлов в `remote` (для retention). */
  lsf(remote: string): Promise<string[]>
  /** Удаление одного файла в `remote`. */
  deletefile(remote: string): Promise<void>
}

const DEFAULT_BINARY = 'rclone'

/**
 * Создаёт rclone-обёртку поверх раннера. Каждая команда получает `--config <configPath>`.
 * Ненулевой exit-код → Error со stderr в сообщении (вызывающий решает, фатально ли).
 */
export function createRclone(
  run: CommandRunner,
  configPath: string,
  binary: string = DEFAULT_BINARY,
): Rclone {
  const base = [binary, '--config', configPath] as const

  async function exec(...args: string[]): Promise<CommandResult> {
    const argv = [...base, ...args]
    const res = await run(argv)
    if (res.exitCode !== 0) {
      throw new Error(
        `rclone ${args[0]} failed (exit ${res.exitCode}): ${res.stderr.trim() || res.stdout.trim()}`,
      )
    }
    return res
  }

  return {
    async sync(src, dst) {
      await exec('sync', src, dst)
    },
    async copyto(src, dst) {
      await exec('copyto', src, dst)
    },
    async lsf(remote) {
      const res = await exec('lsf', remote)
      return res.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    },
    async deletefile(remote) {
      await exec('deletefile', remote)
    },
  }
}
