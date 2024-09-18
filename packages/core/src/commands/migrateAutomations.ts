import * as dotenv from "dotenv";

dotenv.config();

import { Collection, Db, MongoClient } from "mongodb";

const { MONGO_URL } = process.env;

if (!MONGO_URL) {
  throw new Error("Environment variable MONGO_URL not set.");
}

const client = new MongoClient("mongodb://127.0.0.1:27017/erxes");

let db: Db;

let Automations: Collection<any>;
let Executions: Collection<any>;
let Notes: Collection<any>;

const switchContentType = contentType => {
  let changedContentType = contentType;

  switch (contentType) {
    case "cards:deal":
      changedContentType = "sales:deal";
      break;
    case "cards:purchase":
      changedContentType = "purchases:purchase";
      break;
    case "cards:ticket":
      changedContentType = "tickets:ticket";
      break;
    case "cards:task":
      changedContentType = "tasks:task";
      break;
    case "growthhacks:growthHack":
      changedContentType = "growthhacks:growthHack";
      break;

    case "contacts:customer":
      changedContentType = "core:customer";
      break;

    case "contacts:company":
      changedContentType = "core:company";
      break;

    case "contacts:lead":
      changedContentType = "core:lead";
      break;

    case "products:product":
      changedContentType = "core:product";
      break;

    case "emailTemplates:emailTemplate":
      changedContentType = "core:emailTemplate";
      break;

    default:
      changedContentType = contentType;
  }

  return changedContentType;
};

const switchService = service => {
  let changedService = service;

  switch (service) {
    case "cards":
      changedService = "sales";
      break;
    case "cards":
      changedService = "purchases";
      break;
    case "cards":
      changedService = "tickets";
      break;
    case "cards":
      changedService = "tasks";
      break;
    case "cards":
      changedService = "growthhacks";
      break;

    case "contacts":
      changedService = "core";
      break;

    case "products":
      changedService = "core";
      break;

    case "emailTemplates":
      changedService = "core";
      break;

    default:
      changedService = service;
  }

  return changedService;
};

const command = async () => {
  await client.connect();
  db = client.db() as Db;

  Automations = db.collection("automations");
  Notes = db.collection("automations_notes");
  Executions = db.collection("automations_Executions");

  try {
    await Automations.find({}).forEach(automation => {
      const triggers = automation.triggers || [];
      const actions = automation.actions || [];

      const fixedActions = [] as any;
      const fixedTriggers = [] as any;

      for (const trigger of triggers) {
        trigger.type = switchContentType(triggers.type);

        fixedTriggers.push({
          ...trigger
        });
      }

      for (const action of actions) {
        action.type = switchContentType(action.type);

        const { module } = action.config;
        const [serviceName, collectionType] = module.split(":");

        if (module) {
          action.config.module = `${switchService(serviceName)}:${collectionType}`;
        }

        fixedActions.push({
          ...action
        });
      }

      Automations.updateOne(
        { _id: automation._id },
        {
          $set: {
            triggers: fixedTriggers,
            actions: fixedActions
          }
        }
      );
    });
  } catch (e) {
    console.log(e.message);
  }

  try {
    await Executions.find({}).forEach(doc => {
      const triggerType = switchContentType(doc.triggerType);

      Executions.updateOne({ _id: doc._id }, { $set: { triggerType } });
    });

    await Executions.find({}).forEach(execution => {
      const actions = execution.actions || [];
      const fixedActions = [] as any;

      for (const action of actions) {
        const { actionType } = action;
        const [serviceName, collectionType] = actionType.split(":");

        if (actionType) {
          action.actionType = `${switchService(serviceName)}:${collectionType}`;
        }

        fixedActions.push({
          ...action
        });
      }

      Executions.updateOne(
        { _id: execution._id },
        {
          $set: {
            actions: fixedActions
          }
        }
      );
    });
  } catch (e) {
    console.log(e.message);
  }

  console.log("Process finished at: ${new Date()}");

  process.exit();
};

command();
