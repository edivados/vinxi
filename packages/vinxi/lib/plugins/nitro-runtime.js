import { virtual } from "./virtual.js";

export function nitroRuntime() {
	return virtual({
		"#internal/nitro": () => {
			return `
				export const cachedFunction = globalThis.__vinxi_nitro_runtime__.cache.cachedFunction;
				export const defineCachedFunction = globalThis.__vinxi_nitro_runtime__.cache.defineCachedFunction;
				
				export const runCronTasks = globalThis.__vinxi_nitro_runtime__.task.runCronTasks;
			`
		},
		"#internal/nitro/cache": () => {
			return `
				export const cachedFunction = globalThis.__vinxi_nitro_runtime__.cache.cachedFunction;
				export const defineCachedFunction = globalThis.__vinxi_nitro_runtime__.cache.defineCachedFunction;
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
