declare global {
    namespace Cloudflare {
        interface GlobalProps {
            mainModule: typeof import("./worker/index");
            durableNamespaces: "GameRoom";
        }

        interface Env {
            DB: D1Database;
            BUCKET: R2Bucket;
            WS: DurableObjectNamespace<import("./worker/index").GameRoom>;
            MY_VAR: string;
        }
    }

    interface Env extends Cloudflare.Env {
        DB: D1Database;
        BUCKET: R2Bucket;
        WS: DurableObjectNamespace<import("./worker/index").GameRoom>;
        MY_VAR: string;
    }
}

export {};
