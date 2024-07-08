import { listen, resolveCertificate } from "@vinxi/listhen";

import { fileURLToPath, pathToFileURL } from "node:url";

import babel from "@babel/core";
import wsAdapter from "crossws/adapters/node";
import { createApp, eventHandler, fromNodeMiddleware, toNodeListener } from "h3";
import httpProxy from "http-proxy";
import { existsSync, readFileSync } from "node:fs";
import { debounce } from "perfect-debounce";
import serveStatic from "serve-static";
import { consola } from "./logger.js";
import { join, normalize, resolve } from "./path.js";

export * from "./router-dev-plugins.js";

/** @typedef {{ force?: boolean; devtools?: boolean; port?: number; ws?: { port?: number }; https?: import('@vinxi/listhen').HTTPSOptions | boolean; }} DevConfigInput */
/** @typedef {{ force: boolean; port: number; devtools: boolean; ws: { port: number }; https?: import('@vinxi/listhen').Certificate; }} DevConfig */

/**
 *
 * @returns {import('./vite-dev.d.ts').Plugin}
 */
export function devEntries() {
	return {
		name: "vinxi:dev-entries",
		async config(inlineConfig) {
			return {
				build: {
					// rollupOptions: {
					// input: await getEntries(inlineConfig.router),
					// },
				},
			};
		},
	};
}

/**
 *
 * @param {import('vite').InlineConfig & { router: import("./router-mode.js").Router<any>; app: import("./app.js").App }} config
 * @returns
 */
export async function createViteDevServer(config) {
	const vite = await import("vite");
	return vite.createServer(config);
}

/**
 *
 * @param {import('./app.js').App} app
 * @param {import('./router-mode.d.ts').Router<{ plugins?: any }>} router
 * @param {DevConfig} serveConfig
 * @returns {Promise<import("vite").ViteDevServer>}
 */
export async function createViteHandler(router, app, serveConfig) {
	const vite = await import("vite");
	const { getRandomPort } = await import("get-port-please");
	const port = await getRandomPort();
	const plugins = [
		// ...(serveConfig.devtools ? [inspect()] : []),
		...(((await router.internals.type.dev.plugins?.(router, app)) ?? []).filter(
			Boolean,
		) || []),
		...(((await router.plugins?.(router)) ?? []).filter(Boolean) || []),
	].filter(Boolean);

	let base = join(app.config.server.baseURL ?? "/", router.base);

	const viteDevServer = await createViteDevServer({
		configFile: false,
		root: router.root,
		base,
		plugins,
		optimizeDeps: {
			force: serveConfig.force,
		},
		dev: serveConfig,
		router,
		app,
		server: {
			fs: {
				allow: [
					normalize(fileURLToPath(new URL("../", import.meta.url))),
					vite.searchForWorkspaceRoot(process.cwd()),
				],
			},
			middlewareMode: true,
			hmr: {
				port,
			},
			https: serveConfig.https,
		},
	});

	router.internals.devServer = viteDevServer;

	return viteDevServer;
}

/**
 *
 * @param {import('./app.js').App} app
 * @param {DevConfigInput} param1
 * @returns
 */
export async function createDevServer(
	app,
	{
		force = false,
		port = 3000,
		devtools = false,
		ws: { port: wsPort = undefined } = {},
	},
) {
	const https = app.config.server.https;
	const serveConfig = {
		port,
		force,
		devtools,
		ws: {
			port: wsPort,
		},
		https: https
			? await resolveCertificate(typeof https === "object" ? https : {})
			: undefined,
	};

	await app.hooks.callHook("app:dev:start", { app, serveConfig });

	// if (devtools) {
	// 	const { devtoolsClient, devtoolsRpc } = await import("@vinxi/devtools");
	// 	app.addRouter(devtoolsClient());
	// 	app.addRouter(devtoolsRpc());
	// }
	const { createNitro, writeTypes } = await import("nitropack");

	const nitro = await createNitro({
		...app.config.server,
		rootDir: "",
		dev: true,
		typescript: {
			generateTsConfig: false
		},
		rollupConfig: {
			plugins: [
				{
					name: "vinxi:dev-server",
					load(id) {
						if (id.endsWith("nitro-dev.mjs")) {
							return readFileSync(fileURLToPath(new URL("./dev-entry.js", import.meta.url)), "utf-8");
						}
					},
					transform(src, id) {
						if(normalize(id).endsWith("nitropack/dist/runtime/task.mjs")) {
							const lines = src.split("\n");
							// lines.forEach((line, index) => console.log(index, line));
							lines[49] = "  const jobs = [];\n" + lines[49];
							lines[50] = lines[50].replace("const cron = ", "jobs.push(");
							lines[64] = lines[64].replace(";", ");");
							lines[65] = lines[65] + "\n  return jobs;";
							const transformed = babel.transformSync(lines.join("\n"));
							return transformed;
						}
					}
				}
			]
		},
		preset: "nitro-dev",
		publicAssets: [
			...app.config.routers
				.map((router) => {
					return router.internals.type.dev.publicAssets?.(router, app);
				})
				.filter(
					/**
					 * @param {*} asset
					 * @returns {asset is import("./router-mode.js").PublicAsset[]}
					 */
					(asset) => Boolean(asset),
				)
				.flat(),
			...(app.config.server.publicAssets ?? []),
		],
		buildDir: ".vinxi",
		imports: false,
		devHandlers: [
			...(
				await Promise.all(
					app.config.routers
						.sort((a, b) => b.base.length - a.base.length)
						.map((router) =>
							router.internals.type.dev.handler?.(router, app, serveConfig),
						),
				)
			)
				.filter(
					/**
					 * @param {*} asset
					 * @returns {asset is import("./router-mode.js").DevHandler[]}
					 */
					(asset) => Boolean(asset),
				)
				.flat(),
		],
		handlers: [...(app.config.server.handlers ?? [])],
		plugins: [
			fileURLToPath(new URL("./app-fetch.js", import.meta.url)),
			fileURLToPath(new URL("./app-manifest.js", import.meta.url)),
			...(app.config.server.plugins ?? [])
		],
	});

	// We do this so that nitro doesn't try to load app.config.ts files since those are
	// special to vinxi as the app definition files.
	nitro.options.appConfigFiles = [];
	nitro.logger = consola.withTag(app.config.name);

	await app.hooks.callHook("app:dev:nitro:config", { app, nitro });

	const devApp = createApp();

	// Serve asset dirs
	for (const asset of nitro.options.publicAssets) {
		devApp.use(
			asset.baseURL || "/", 
			fromNodeMiddleware(serveStatic(asset.dir, { fallthrough: asset.fallthrough }))
		);
	}

	// User defined dev proxy
	for (const route of Object.keys(nitro.options.devProxy).sort().reverse()) {
		let opts = nitro.options.devProxy[route];
		if (typeof opts === "string") {
			opts = { target: opts };
		}
		const proxy = createProxy(opts);
		devApp.use(
			route,
			eventHandler(async (event) => {
				await proxy.handle(event);
			})
		);
	}

	// Dev-only handlers
	for (const handler of nitro.options.devHandlers) {
		devApp.use(handler.route ?? "/", handler.handler);
	}

	const { build, prepare } = await import("nitropack");

	await prepare(nitro)
	await build(nitro);
	await waitForServerOutput(nitro);

	/** @type {{ close: () => Promise<void>}} */
	let server;

	const restart = debounce(async () => {
		server && await server.close();
		
		/** @type {import("nitropack").NitroApp} */
		const nitroApp = await import(
			pathToFileURL(resolve(nitro.options.output.serverDir, `index.mjs`)).href + `?t=${new Date().getTime()}`
		).then(mod => mod.default);

		nitroApp.router.use("/**", devApp.handler);

		await app.hooks.callHook("app:dev:server:created", { app, devApp: nitroApp });
		await app.hooks.callHook("app:dev:server:listener:creating", { app, devApp: nitroApp });

		/** @type {import("@vinxi/listhen").Listener} */
		const listener = await listen(toNodeListener(nitroApp.h3App), {
			port,
			https: serveConfig.https
		});

		await app.hooks.callHook("app:dev:server:listener:created", { app, devApp: nitroApp, listener });

		if (nitro.options.experimental?.websocket) {
		  const { handleUpgrade } = wsAdapter(nitroApp.h3App.websocket);
		  listener.server.on("upgrade", handleUpgrade);
		}

		server = {
			async close() {
				await nitroApp.hooks.callHook("close");
				await listener.close();
			}
		}
	});
	
	nitro.hooks.hook("dev:reload", async () => {
		await restart();
		app.config.routers
			.filter(router => router.target === "server" && router.internals.devServer)
			.forEach(router => {
				const mod = router.internals.devServer?.moduleGraph.getModuleById("\x00virtual:#internal/nitro/task");
				mod && router.internals.devServer?.moduleGraph.invalidateModule(mod);
			});
	});
	nitro.hooks.hookOnce("close", async () => {
		server && await server.close();
	});

	return {
		listen: async () => restart(),
		close: async () => {
			await app.hooks.callHook("app:dev:server:closing", { app });
			await nitro.close();
			await Promise.all(
				app.config.routers
					.filter((router) => router.internals.devServer)
					.map((router) => router.internals.devServer?.close()),
			);
			await app.hooks.callHook("app:dev:server:closed", { app });
		},
	};
}

function createProxy(defaults = {}) {
	const proxy = httpProxy.createProxy();
	const handle = (event, opts = {}) => {
		return new Promise((resolve, reject) => {
			proxy.web(
				event.node.req,
				event.node.res,
				{ ...defaults, ...opts },
				(error) => {
					if (error.code !== "ECONNRESET") {
						reject(error);
					}
					resolve();
				},
			);
		});
	};
	return {
		proxy,
		handle,
	};
}

async function waitForServerOutput(nitro) {
	return new Promise((resolve) => {
		const checkServerOutput = () => {
			if (existsSync(join(nitro.options.output.serverDir, "index.mjs"))) {
				resolve(true);
				return;
			}
			setTimeout(checkServerOutput);
		};
		checkServerOutput();
	});
}
