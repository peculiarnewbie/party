declare global {
    namespace Cloudflare {
        interface GlobalProps {
            mainModule: typeof import("./worker/index");
        }

        interface Env {
            DB: D1Database;
            ADMIN_PASSWORD: string;
            SESSION_SECRET: string;
        }
    }

    interface Env extends Cloudflare.Env {}
}

export {};
