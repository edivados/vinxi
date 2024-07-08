/**
 *
 * @returns {import("../vite-dev.d.ts").Plugin}
 */
export function externalNitroImports() {
    return {
        name: "vinxi:external-nitro-imports",
        config(){
            return {
                build: {
                    rollupOptions: {
                        external: [
                            "#internal/nitro/task"
                        ]
                    }
                }
            }
        }
    }
}