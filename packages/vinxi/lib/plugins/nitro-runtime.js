import { virtual } from "./virtual.js";

export function nitroRuntime() {
	return virtual({
		"#internal/nitro": () => {
			return `
				export const runCronTasks = globalThis.__vinxi_nitro_runtime__.task.runCronTasks;
			`
		},
    "#internal/nitro/task": () => {
			return `
				export const runTask = globalThis.__vinxi_nitro_runtime__.task.runTask;
				export const getCronTasks = globalThis.__vinxi_nitro_runtime__.task.getCronTasks;
				export const runCronTasks = globalThis.__vinxi_nitro_runtime__.task.runCronTasks;
			`
		}
  });
}
