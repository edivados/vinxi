export default function plugin(app) {
	globalThis.$handle = (event) => app.h3App.handler(event);
	globalThis.$fetch = app.localFetch;
}
