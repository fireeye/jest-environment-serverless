/* Copyright (C) 2019 FireEye, Inc. All Rights Reserved. See LICENSE file. */

// Help resolve peer dependencies
const path = require('path');

module.paths.unshift(path.join(process.cwd(), 'node_modules'));

const NodeEnvironment = require('jest-environment-node');
const Serverless = require('serverless');

class ServerlessWrapper extends NodeEnvironment {
  constructor(config) {
    super(config);

    const wrapperPath = path.join(__dirname, 'lambda_wrapper.js');
    const ignoreCoveragePaths = ['\\.serverless', '\\.serverless_plugins'];

    // Add the LambdaWrapper to the front of the `setupFiles` list
    if (!Array.isArray(config.setupFiles)) {
      config.setupFiles = [];
    }
    if (!config.setupFiles.includes(wrapperPath)) {
      config.setupFiles.unshift(wrapperPath);
    }

    // Add the LambdaWrapper to the front of the `setupFiles` list
    if (!Array.isArray(config.coveragePathIgnorePatterns)) {
      config.coveragePathIgnorePatterns = ['node_modules'];
    }
    const pathsToAdd = ignoreCoveragePaths.filter(
      item => !config.coveragePathIgnorePatterns.includes(item)
    );
    if (pathsToAdd.length) {
      config.coveragePathIgnorePatterns.push(...pathsToAdd);
    }

    this.global.ServerlessWrapper = {
      Serverless,
      rootDir: config.cwd,
    };

    this.global.process.env.SERVERLESS_TEST_ROOT = true;

    const serverless = new Serverless({
      interactive: false,
      servicePath: config.cwd,
    });
    this.global.ServerlessWrapper.serverless = serverless;
    this.global.ServerlessWrapper.getEnv = this.getEnv;
    this.global.ServerlessWrapper.setEnv = this.setEnv;
  }

  async setup() {
    await super.setup();

    const { serverless } = this.global.ServerlessWrapper;

    await serverless.init();
    await serverless.variables.populateService({});

    serverless.service.mergeArrays();
    serverless.service.setFunctionNames({});
    serverless.service.validate();

    // Populate all env vars
    const serviceVars = serverless.service.provider.environment || {};
    const functionVars = serverless.service.getAllFunctions().map(this.getEnv.bind(this));
    const vars = Object.assign({}, serviceVars, ...functionVars);
    Object.assign(this.global.process.env, vars);
  }

  getEnv(funcName) {
    const useGlobal = !(this.global && this.global.ServerlessWrapper);
    let instance;

    if (useGlobal) {
      instance = this.serverless;
    } else {
      instance = this.global.ServerlessWrapper.serverless;
    }

    return instance.service.functions[funcName]
      ? instance.service.functions[funcName].environment
      : {};
  }

  setEnv(funcName) {
    const useGlobal = !(this.global && this.global.ServerlessWrapper);
    const vars = this.getEnv(funcName);

    let env;

    if (useGlobal) {
      env = Object.assign(process.env, vars);
    } else {
      env = Object.assign(this.global.process.env, vars);
    }

    return env;
  }

  async tearDown() {
    delete this.global.ServerlessWrapper;
  }
}

module.exports = ServerlessWrapper;
