/**
 *
 * @returns {import("../vite-dev.d.ts").Plugin}
 */
export function externalizeNitro() {
	return {
		name: "vinxi:externalizeNitro",
		config() {
			return {
				build: {
					rollupOptions: {
						external: [
							/#internal\/nitro(?:[\/]\w+)*/
						]
					}
				}
			}
		}
	}
}