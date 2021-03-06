const SilentError = require('silent-error');

import { overrideOptions } from '../utilities/override-options';
import { CliConfig } from '../models/config';
import { DeployTaskOptions, baseDeployCommandOptions} from './deploy';
import { oneLine } from 'common-tags';
const Command = require('../ember-cli/lib/models/command');


export interface E2eTaskOptions extends DeployTaskOptions {
  config: string;
  deploy: boolean;
  ssl: string;
  webdriverUpdate: boolean;
  specs: string[];
  elementExplorer: boolean;
}

const E2eCommand = Command.extend({
  name: 'e2e',
  aliases: ['e'],
  description: 'Run e2e tests in existing project.',
  works: 'insideProject',
  availableOptions: overrideOptions([
    ...baseDeployCommandOptions,
    {
      name: 'config',
      type: String,
      aliases: ['c'],
      description: oneLine`
        Use a specific config file.
        Defaults to the protractor config file in speedray-cli.json.
      `
    },
    {
      name: 'specs',
      type: Array,
      default: [],
      aliases: ['sp'],
      description: oneLine`
        Override specs in the protractor config.
        Can send in multiple specs by repeating flag (sr e2e --specs=spec1.ts --specs=spec2.ts).
      `
    },
    {
      name: 'element-explorer',
      type: Boolean,
      default: false,
      aliases: ['ee'],
      description: 'Start Protractor\'s Element Explorer for debugging.'
    },
    {
      name: 'webdriver-update',
      type: Boolean,
      default: true,
      aliases: ['wu'],
      description: 'Try to update webdriver.'
    },
    {
      name: 'deploy',
      type: Boolean,
      default: true,
      aliases: ['de'],
      description: oneLine`
        Compile and Deploy the app.
        All non-reload related deploy options are also available (e.g. --port=11311).
      `
    }
  ], [
    {
      name: 'port',
      default: 11311,
      description: 'The port to use to deploy the application.'
    },
    {
      name: 'watch',
      default: false,
      description: 'Run build when files change.'
    },
  ]),
  run: function (commandOptions: E2eTaskOptions) {
    const E2eTask = require('../tasks/e2e').E2eTask;

    const e2eTask = new E2eTask({
      ui: this.ui,
      project: this.project
    });

    if (!commandOptions.config) {
      const e2eConfig = CliConfig.fromProject().config.e2e;

      if (!e2eConfig.protractor.config) {
        throw new SilentError('No protractor config found in .speedray-cli.json.');
      }

      commandOptions.config = e2eConfig.protractor.config;
    }

    if (commandOptions.deploy) {
      const DeployTask = require('../tasks/speedray/deploy').default;

      const deploy = new DeployTask({
        ui: this.ui,
        cliProject: this.project,
      });

      // Protractor will end the proccess, so we don't need to kill the dev server
      return new Promise((resolve, reject) => {
        let firstRebuild = true;
        function rebuildCb() {
          // don't run re-run tests on subsequent rebuilds
          if (firstRebuild) {
            firstRebuild = false;
            return resolve(e2eTask.run(commandOptions));
          }
        }

        deploy.run(commandOptions, rebuildCb).catch(reject);
      });
    } else {
      return e2eTask.run(commandOptions);
    }
  }
});


export default E2eCommand;
