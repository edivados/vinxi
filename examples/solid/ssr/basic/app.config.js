import { serverFunctions } from "@vinxi/server-functions/plugin";
import { createApp } from "vinxi";
import { config } from "vinxi/plugins/config";
import solid from "vite-plugin-solid";

export default createApp({
	server: {
		experimental: {
			asyncContext: true,
			websocket: true,
			tasks: true
		},
		tasks: {
			"my-task": {
				handler: "./my-task.ts",
			}
		},
		scheduledTasks: {
			'* * * * *': ['my-task']
		},
		plugins: [
			"./my-plugin.ts"
		]
	},
	routers: [
		{
			name: "public",
			type: "static",
			dir: "./public",
			base: "/",
		},
		{
			name: "ssr",
			type: "http",
			base: "/",
			handler: "./app/server.tsx",
			target: "server",
			plugins: () => [solid({ ssr: true })],
			link: {
				client: "client",
			},
		},
		{
			name: "client",
			type: "client",
			handler: "./app/client.tsx",
			target: "browser",
			plugins: () => [serverFunctions.client(), solid({ ssr: true })],
			base: "/_build",
		},
		{
			name: "ws",
			type: "http",
			handler: "./app/ws.ts",
			target: "server",
			base: "/_ws",
		},
		serverFunctions.router(),
	],
});
