/**
 * /.well-known/openid-configuration  — OIDC Discovery Document
 *
 * This route is mounted at the ROOT of the Express app (not under /api)
 * so it's served at /.well-known/openid-configuration.
 */

import { Router, type Request, type Response } from "express";
import { API_ORIGIN } from "../lib/constants";

const router = Router();

router.get("/.well-known/openid-configuration", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.json({
    issuer:                                API_ORIGIN,
    authorization_endpoint:                `${API_ORIGIN}/api/oauth/authorize`,
    token_endpoint:                        `${API_ORIGIN}/api/oauth/token`,
    userinfo_endpoint:                     `${API_ORIGIN}/api/oauth/userinfo`,
    jwks_uri:                              `${API_ORIGIN}/.well-known/jwks.json`,
    response_types_supported:              ["code"],
    subject_types_supported:               ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported:                      ["openid", "profile", "email", "phone", "offline_access"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    claims_supported: [
      "sub", "name", "preferred_username", "picture", "profile",
      "email", "email_verified", "phone_number", "phone_number_verified", "website",
    ],
    code_challenge_methods_supported:      ["S256", "plain"],
    grant_types_supported:                 ["authorization_code", "refresh_token"],
    response_modes_supported:              ["query"],
    service_documentation:                 `${API_ORIGIN}/api/oauth/developer`,
  });
});

// JWKS stub (for OIDC compliance — RS256 is optional but listed above)
router.get("/.well-known/jwks.json", (_req: Request, res: Response) => {
  res.json({ keys: [] });
});

export default router;
