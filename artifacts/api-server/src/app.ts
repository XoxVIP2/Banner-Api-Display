import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

/* pino-http uses `export =` syntax; the default import lacks call signatures
   under bundler moduleResolution — cast to any for the type-checker only.
   Runtime is unaffected (esbuild resolves the CJS callable correctly). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoMiddleware = (pinoHttp as any) as (opts: Record<string, unknown>) => express.RequestHandler;

app.use(
  pinoMiddleware({
    logger,
    serializers: {
      req(req: { id: unknown; method: string; url?: string }) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: { statusCode: number }) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
