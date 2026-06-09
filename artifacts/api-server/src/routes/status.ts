import { Router, type Request, type Response } from "express";
import { getAdminClient } from "../lib/supabase-admin";
import { isR2Configured } from "../lib/r2";

const router = Router();

type ServiceStatus = "operational" | "degraded" | "outage";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latency_ms?: number;
  message?: string;
}

interface StatusResponse {
  overall: ServiceStatus;
  checked_at: string;
  services: ServiceCheck[];
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("app_settings").select("key").limit(1);
    const latency_ms = Date.now() - start;
    if (error) {
      return { name: "Database", status: "outage", latency_ms, message: error.message };
    }
    return { name: "Database", status: "operational", latency_ms };
  } catch (e: any) {
    return { name: "Database", status: "outage", latency_ms: Date.now() - start, message: e?.message };
  }
}

function checkStorage(): ServiceCheck {
  const r2Url = process.env["R2_PUBLIC_BASE_URL"] || process.env["R2_DEV_PUBLIC_URL"];
  const configured = isR2Configured();
  if (!configured) {
    return { name: "File Storage", status: "degraded", message: "R2 storage not configured — uploads unavailable" };
  }
  if (!r2Url) {
    return { name: "File Storage", status: "degraded", message: "Storage configured but public URL missing" };
  }
  return { name: "File Storage", status: "operational" };
}

function checkVideoProcessing(): ServiceCheck {
  const workerDisabled = process.env["VIDEO_WORKER_ENABLED"] === "false";
  if (workerDisabled) {
    return { name: "Video Processing", status: "degraded", message: "Video worker disabled" };
  }
  return { name: "Video Processing", status: "operational" };
}

function checkPayments(): ServiceCheck {
  const configured =
    !!process.env["PESAPAL_CONSUMER_KEY"] && !!process.env["PESAPAL_CONSUMER_SECRET"];
  return {
    name: "Payments",
    status: configured ? "operational" : "degraded",
    message: configured ? undefined : "Payment gateway not configured",
  };
}

function checkNotifications(): ServiceCheck {
  return { name: "Push Notifications", status: "operational" };
}

function overallStatus(services: ServiceCheck[]): ServiceStatus {
  if (services.some((s) => s.status === "outage")) return "outage";
  if (services.some((s) => s.status === "degraded")) return "degraded";
  return "operational";
}

router.get("/status", async (_req: Request, res: Response) => {
  const [db] = await Promise.all([checkDatabase()]);

  const services: ServiceCheck[] = [
    db,
    checkStorage(),
    checkVideoProcessing(),
    checkPayments(),
    checkNotifications(),
  ];

  const body: StatusResponse = {
    overall: overallStatus(services),
    checked_at: new Date().toISOString(),
    services,
  };

  const httpStatus = body.overall === "outage" ? 503 : 200;
  res.status(httpStatus).json(body);
});

export default router;
