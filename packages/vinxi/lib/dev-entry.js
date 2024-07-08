import "#internal/nitro/virtual/polyfill";
import { scheduledTasks, tasks } from "#internal/nitro/virtual/tasks";
import { nitroApp } from "../app.mjs";
import { getCronTasks, runCronTasks, runTask, startScheduleRunner } from "../task.mjs";
import { trapUnhandledNodeErrors } from "../utils.mjs";

import {
  defineEventHandler,
  getQuery,
  getRouterParam,
  readBody
} from "h3";

// Register tasks handlers
nitroApp.router.get(
  "/_nitro/tasks",
  defineEventHandler(async (event) => {
    const _tasks = await Promise.all(
      Object.entries(tasks).map(async ([name, task]) => {
        const _task = await task.resolve?.();
        return [name, { description: _task?.meta?.description }];
      })
    );
    return {
      tasks: Object.fromEntries(_tasks),
      scheduledTasks,
    };
  })
);
nitroApp.router.use(
  "/_nitro/tasks/:name",
  defineEventHandler(async (event) => {
    const name = getRouterParam(event, "name");
    const payload = {
      ...getQuery(event),
      ...(await readBody(event)
        .then((r) => r?.payload)
        .catch(() => ({}))),
    };
    return await runTask(name, { payload });
  })
);

// Trap unhandled errors
trapUnhandledNodeErrors();

// Graceful shutdown
process.once("exit", onShutdown);

async function onShutdown(signal) {
  await nitroApp.hooks.callHook("close");
}

// Scheduled tasks
if (import.meta._tasks) {
  const jobs = startScheduleRunner();
  nitroApp.hooks.hookOnce("close", () => {
    jobs.forEach(job => job.stop());
  });
}

globalThis.__vinxi_nitro_runtime__ = {
  task: {
    runTask,
    getCronTasks,
    runCronTasks
  }
};

export default nitroApp;
