import path from "path";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
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

app.use(express.static(path.join(__dirname, "../public")));
app.use("/api", router);

app.use("/api", (req: Request, res: Response) => {
  res
    .status(404)
    .type("application/json")
    .send(JSON.stringify({ error: `No API route for ${req.method} ${req.path}` }));
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = typeof err?.status === "number" ? err.status : 500;
  const payload = {
    error: err?.message || "Internal server error",
    code: err?.code || undefined,
  };
  try {
    (req as any).log?.error({ err, url: req.url }, "request failed");
  } catch {
    /* logger may not be attached for very early errors */
  }
  if (res.headersSent) {
    res.end();
    return;
  }
  res.status(status).type("application/json").send(JSON.stringify(payload));
});

export default app;
