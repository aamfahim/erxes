import * as dotenv from "dotenv";

// load environment variables
dotenv.config();

import * as cookieParser from "cookie-parser";
import * as cors from "cors";
import * as telemetry from "erxes-telemetry";
import * as express from "express";
import * as helmet from "helmet";
import { createServer } from "http";
import * as mongoose from "mongoose";
import * as path from "path";
import { initApolloServer } from "./apolloClient";
import { templateExport } from "./data/modules/fileExporter/templateExport";

import * as fs from "fs";

import {
  deleteFile,
  getEnv,
  handleUnsubscription,
  readFileRequest,
  registerOnboardHistory,
  routeErrorHandling,
  uploadsFolderPath
} from "./data/utils";

import { debugBase, debugError, debugInit } from "./debuggers";
import {
  initBroker,
  sendCommonMessage,
  setupMessageConsumers
} from "./messageBroker";
import { uploader } from "./middlewares/fileMiddleware";
import {
  getService,
  getServices,
  isEnabled,
  join,
  leave
} from "@erxes/api-utils/src/serviceDiscovery";
import logs from "./logUtils";

import init from "./startup";
import forms from "./forms";
import { generateModels } from "./connectionResolver";
import { authCookieOptions, getSubdomain } from "@erxes/api-utils/src/core";
import segments from "./segments";
import automations from "./automations";
import templates from "./templates";
import imports from "./imports";
import exporter from "./exporter";
import { moduleObjects } from "./data/permissions/actions/permission";
import { getEnabledServices } from "@erxes/api-utils/src/serviceDiscovery";
import { applyInspectorEndpoints } from "@erxes/api-utils/src/inspect";
import { handleCoreLogin, handleMagiclink, ssocallback } from "./saas";
import app from "@erxes/api-utils/src/app";
import sanitizeFilename from "@erxes/api-utils/src/sanitize-filename";
import search from "./search";
import tags from "./tags";

const {
  JWT_TOKEN_SECRET,
  WIDGETS_DOMAIN,
  DOMAIN,
  CLIENT_PORTAL_DOMAINS,
  VERSION
} = process.env;

// if (!JWT_TOKEN_SECRET) {
//   throw new Error("Please configure JWT_TOKEN_SECRET environment variable.");
// }

// // don't move it above telnyx controllers
// app.use(express.urlencoded({ limit: "15mb", extended: true }));

// app.use(
//   express.json({
//     limit: "15mb"
//   })
// );

// app.use(cookieParser());

// const corsOptions = {
//   credentials: true,
//   origin: [
//     DOMAIN ? DOMAIN : "http://localhost:3000",
//     WIDGETS_DOMAIN ? WIDGETS_DOMAIN : "http://localhost:3200",
//     ...(CLIENT_PORTAL_DOMAINS || "").split(","),
//     ...(process.env.ALLOWED_ORIGINS || "").split(",").map(c => c && RegExp(c))
//   ]
// };

// app.use(cors(corsOptions));

// app.use(helmet({ frameguard: { action: "sameorigin" } }));

// app.get(
//   "/initial-setup",
//   routeErrorHandling(async (req: any, res) => {
//     console.log("initial setup");
//     const subdomain = getSubdomain(req);
//     const models = await generateModels(subdomain);

//     const userCount = await models.Users.countDocuments();

//     if (userCount === 0) {
//       return res.send("no owner");
//     }

//     if (req.query && req.query.update) {
//       const services = await getServices();

//       for (const serviceName of services) {
//         const service = await getService(serviceName);
//         const meta = service.config?.meta || {};

//         if (meta && meta.initialSetup && meta.initialSetup.generateAvailable) {
//           await sendCommonMessage({
//             subdomain,
//             action: "initialSetup",
//             serviceName,
//             data: {}
//           });
//         }
//       }
//     }

//     const envMaps = JSON.parse(req.query.envs || "{}");

//     for (const key of Object.keys(envMaps)) {
//       res.cookie(key, envMaps[key], authCookieOptions({ secure: req.secure }));
//     }

//     const configs = await models.Configs.find({
//       code: new RegExp(`.*THEME_.*`, "i")
//     }).lean();

//     await models.FieldsGroups.createSystemGroupsFields();

//     return res.json(configs);
//   })
// );

// // app.post('/webhooks/:id', webhookMiddleware);

// app.use("/static", express.static(path.join(__dirname, "private")));

// app.get(
//   "/download-template",
//   routeErrorHandling(async (req: any, res) => {
//     const name = req.query.name;

//     const subdomain = getSubdomain(req);
//     const models = await generateModels(subdomain);

//     registerOnboardHistory({ models, type: `${name}Download`, user: req.user });

//     return res.redirect(
//       `https://erxes-docs.s3-us-west-2.amazonaws.com/templates/${name}`
//     );
//   })
// );

// app.get(
//   "/template-export",
//   routeErrorHandling(async (req: any, res) => {
//     const { importType } = req.query;

//     const subdomain = getSubdomain(req);
//     const models = await generateModels(subdomain);

//     registerOnboardHistory({
//       models,
//       type: `importDownloadTemplate`,
//       user: req.user
//     });

//     const { name, response } = await templateExport(req.query);

//     res.attachment(`${name}.${importType}`);
//     return res.send(response);
//   })
// );

// // read file
// app.get("/read-file", async (req: any, res, next) => {
//   const subdomain = getSubdomain(req);
//   const models = await generateModels(subdomain);

//   try {
//     const { key, inline, name, width } = req.query;

//     if (!key) {
//       return res.send("Invalid key");
//     }

//     const response = await readFileRequest({
//       key,
//       subdomain,
//       models,
//       userId: req.headers.userid,
//       width
//     });

//     if (inline && inline === "true") {
//       const extension = key.split(".").pop();
//       res.setHeader("Content-disposition", 'inline; filename="' + key + '"');
//       res.setHeader("Content-type", `application/${extension}`);

//       return res.send(response);
//     }

//     res.attachment(name || key);

//     return res.send(response);
//   } catch (e) {
//     if ((e as Error).message.includes("key does not exist")) {
//       return res.status(404).send("Not found");
//     }

//     debugError(e);

//     return next(e);
//   }
// });

// // delete file
// app.post(
//   "/delete-file",
//   routeErrorHandling(async (req: any, res) => {
//     // require login
//     if (!req.headers.userid) {
//       return res.end("forbidden");
//     }

//     const subdomain = getSubdomain(req);
//     const models = await generateModels(subdomain);

//     const status = await deleteFile(models, req.body.fileName);

//     if (status === "ok") {
//       return res.send(status);
//     }

//     return res.status(500).send(status);
//   })
// );

// // unsubscribe
// app.get(
//   "/unsubscribe",
//   routeErrorHandling(async (req: any, res) => {
//     const subdomain = getSubdomain(req);
//     const models = await generateModels(subdomain);

//     await handleUnsubscription(models, subdomain, req.query);

//     res.setHeader("Content-Type", "text/html; charset=utf-8");

//     const template = fs.readFileSync(
//       __dirname + "/private/emailTemplates/unsubscribe.html"
//     );

//     return res.send(template);
//   })
// );

// app.post("/upload-file", uploader);

// app.post("/upload-file&responseType=json", uploader);

// app.get("/ml-callback", (req: any, res) => handleMagiclink(req, res));
// app.get("/core-login", (req: any, res) => handleCoreLogin(req, res));
// app.get("/sso-callback", ssocallback);

// // Error handling middleware
// app.use((error, _req, res, _next) => {
//   debugError(error.message);
//   res.status(500).send(error.message);
// });

// app.get("/get-import-file/:fileName", async (req, res) => {
//   const fileName = req.params.fileName;

//   const sanitizeFileName = sanitizeFilename(fileName);

//   const filePath = path.join(uploadsFolderPath, sanitizeFileName);

//   res.sendFile(filePath);
// });

// app.get("/plugins/enabled/:name", async (req, res) => {
//   const result = await isEnabled(req.params.name);
//   res.json(result);
// });

// app.get("/plugins/enabled", async (_req, res) => {
//   const result = (await getEnabledServices()) || [];
//   res.json(result);
// });

// applyInspectorEndpoints("core");

// // Wrap the Express server
// const httpServer = createServer(app);

// const PORT = getEnv({ name: "PORT" });

// httpServer.listen(PORT, async () => {
//   await initApolloServer(app, httpServer);

//   await initBroker();

//   init()
//     .then(() => {
//       telemetry.trackCli("server_started");
//       telemetry.startBackgroundUpdate();

//       debugBase("Startup successfully started");
//     })
//     .catch(e => {
//       debugError(`Error occured while starting init: ${e.message}`);
//     });

//   await join({
//     name: "core",
//     port: PORT,
//     hasSubscriptions: false,
//     meta: {
//       logs: { providesActivityLog: true, consumers: logs },
//       forms,
//       segments,
//       automations,
//       templates,
//       search,
//       permissions: moduleObjects,
//       tags,
//       imports,
//       exporter,
//       cronjobs: {
//         handle10MinutelyJobAvailable: VERSION === "saas" ? true : false
//       }
//     }
//   });

//   debugInit(`GraphQL Server is now running on ${PORT}`);
// });

export default {
  name: "core",
  permissions,
  // for fixing permissions
  meta: {
    logs: { providesActivityLog: true, consumers: logs },
    forms,
    segments,
    automations,
    templates,
    search,
    permissions: moduleObjects,
    tags,
    imports,
    exporter,
    cronjobs: {
      handle10MinutelyJobAvailable: VERSION === "saas" ? true : false
    }
  },
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers: await resolvers()
    };
  },
  apolloServerContext: async (context, req) => {
    const subdomain = getSubdomain(req);

    context.models = await generateModels(subdomain);
    context.subdomain = subdomain;

    return context;
  },
  onServerInit: async () => {},
  setupMessageConsumers
};