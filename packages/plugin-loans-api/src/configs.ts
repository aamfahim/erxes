import typeDefs from './graphql/typeDefs';
import resolvers from './graphql/resolvers';
import { generateModels } from './connectionResolver';
import { setupMessageConsumers } from './messageBroker';
import documents from './documents';
import forms from './forms';
import imports from './imports';
import exporter from './exporter';
import logs from './logUtils';
import * as permissions from './permissions';
import payment from './payment';
import reports from './reports';
import { checkContractPeriod } from './cronjobs/contractCronJobs';
import { getSubdomain } from '@erxes/api-utils/src/core';

interface IConfig {
  name: string;
  permissions: any;
  graphql: Function;

  apolloServerContext: any;

  onServerInit: any;
  meta: {
    logs: any;
    cronjobs: {
      handleDailyJob: any;
      handleMinutelyJob: any;
    };
    documents: any;
    permissions: any;
    forms: any;
    imports: any;
    exporter: any;
    payment: any;
  };
}

export default {
  name: 'loans',
  permissions,
  graphql: async () => {
    return {
      typeDefs: await typeDefs(),
      resolvers: await resolvers(),
    };
  },
  hasSubscriptions: true,
  subscriptionPluginPath: require('path').resolve(
    __dirname,
    'graphql',
    'subscriptionPlugin.js',
  ),
  apolloServerContext: async (context, req) => {
    const subdomain = getSubdomain(req);

    context.subdomain = subdomain;
    context.models = await generateModels(subdomain);

    return context;
  },

  onServerInit: async () => {},
  setupMessageConsumers,
  meta: {
    logs: { consumers: logs },
    cronjobs: {
      handleMinutelyJob: checkContractPeriod,
    },
    documents,
    permissions,
    forms,
    imports,
    exporter,
    payment,
  },
};
