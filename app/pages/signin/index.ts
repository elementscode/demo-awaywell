import { Request, Response, redirect, session } from "@elements/app";
import config from "#config";
import { demoLogins } from "#app/shared/services/auth";
import html from "./template";

export default function route(req: Request, res: Response) {
  if (session.isLoggedIn()) {
    redirect(session.get("role") === "manager" ? "/approvals" : "/");
    return;
  }

  return new html({ logins: config.demo.showLogins ? demoLogins() : [] });
}
