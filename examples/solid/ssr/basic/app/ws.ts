import { defineEventHandler } from "vinxi/http";
import { runTask } from "#internal/nitro/task";

export default defineEventHandler({
    websocket: {
        upgrade() {
            console.log("Upgrade");
        },
        open() {
            console.log("Open");
        },
        close() {
            console.log("close");
        },
        error() {
            console.log("error");
        }
    },
    handler: () => {
        runTask("my-task");
        return "This is the ws handlers."
    },
})