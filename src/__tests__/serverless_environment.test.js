/* Copyright (C) 2019 FireEye, Inc. All Rights Reserved. See LICENSE file. */

const { readConfig } = require('jest-config');
const Runtime = require('jest-runtime');
const { CustomConsole } = require('@jest/console');

const path = jest.requireActual('path');
const ServerlessEnvironment = jest.requireActual('../');
const Serverless = jest.requireActual('serverless');

describe('ServerlessEnvironment', () => {
  it('uses a copy of the process object', () => {
    const env1 = new ServerlessEnvironment({});
    const env2 = new ServerlessEnvironment({});

    expect(env1.global.process).not.toBe(env2.global.process);
  });

  it('exposes process.on', () => {
    const env1 = new ServerlessEnvironment({});

    expect(env1.global.process.on).not.toBe(null);
  });

  it('exposes global.global', () => {
    const env1 = new ServerlessEnvironment({});

    expect(env1.global.global).toBe(env1.global);
  });

  it('should configure setTimeout/setInterval to use the node api', () => {
    const env1 = new ServerlessEnvironment({});

    env1.fakeTimers.useFakeTimers();

    const timer1 = env1.global.setTimeout(() => {}, 0);
    const timer2 = env1.global.setInterval(() => {}, 0);

    [timer1, timer2].forEach((timer) => {
      expect(timer.id).toBeDefined();
      expect(typeof timer.ref).toBe('function');
      expect(typeof timer.unref).toBe('function');
    });
  });

  it('exposes global.ServerlessWrapper and default properties', () => {
    const config = {};
    const env1 = new ServerlessEnvironment(config);

    // Verify updated config properties
    ['setupFiles', 'coveragePathIgnorePatterns'].forEach((field) => {
      expect(config).toHaveProperty(field);
      expect(Array.isArray(config[field])).toBeTruthy();
    });

    expect(env1.global.ServerlessWrapper).toBeDefined();
    // Verify global context properties
    ['Serverless', 'rootDir', 'serverless'].forEach((field) =>
      expect(env1.global.ServerlessWrapper).toHaveProperty(field)
    );
    expect(env1.global.ServerlessWrapper.Serverless).toBe(Serverless);
    expect(env1.global.ServerlessWrapper.serverless).toBeInstanceOf(Serverless);
  });

  it('sets global.process.env.SERVERLESS_TEST_ROOT', () => {
    const env1 = new ServerlessEnvironment({});

    expect(env1.global).toHaveProperty('process.env.SERVERLESS_TEST_ROOT', 'true');
  });

  it('only adds the LambdaWrapper to the setupFiles array once', () => {
    const config = {
      setupFiles: [],
    };

    // Simulate multiple Jest runtimes executing
    /* eslint-disable no-new */
    new ServerlessEnvironment(config);
    new ServerlessEnvironment(config);
    new ServerlessEnvironment(config);
    /* eslint-disable no-new */

    expect(config.setupFiles).toEqual([path.join(__dirname, '../', 'lambda_wrapper.js')]);
  });

  describe('setEnv', () => {
    let slsEnv;

    beforeEach(() => {
      slsEnv = new ServerlessEnvironment({
        cwd: path.join(__dirname, 'sample_sls_project'),
      });
    });

    it('sets the environment variables globally', async () => {
      const functionEnv = slsEnv.setEnv('hello');
      expect(functionEnv).not.toHaveProperty('HELLO');
    });
  });

  describe('ServerlessWrapper', () => {
    let slsEnv;
    let LambdaWrapper;

    beforeAll(async () => {
      const { globalConfig, projectConfig } = await readConfig([], path.join(__dirname, '../'));
      const config = {
        ...projectConfig,
        cwd: path.join(__dirname, 'sample_sls_project'),
      };

      slsEnv = new ServerlessEnvironment(config);

      const context = await Runtime.createContext(config, {
        console: new CustomConsole(process.stdout, process.stdout),
        maxWorkers: globalConfig.maxWorkers,
        watch: false,
        watchman: globalConfig.watchman,
      });

      await slsEnv.setup();

      const runtime = new Runtime(config, slsEnv, context.resolver, context.hasteFS);
      // Jest 25.2 branch no longer auto-imports setupFiles when creating
      // a new Runtime >:(
      config.setupFiles.forEach((path) => runtime.requireActual(path));

      // eslint-disable-next-line prefer-destructuring
      LambdaWrapper = slsEnv.global.LambdaWrapper;
    });

    afterAll(async () => {
      await slsEnv.tearDown();
    });

    it('wraps and retrieves a function from serverless.yml', async () => {
      const wrapped = await LambdaWrapper.getWrapper('hello');
      const response = await wrapped.run();
      expect(response).toBeDefined();
      expect(response).toHaveProperty('statusCode', 200);
    });

    describe('setEnv', () => {
      it('uses the supplied Serverless instance if provided', async () => {
        slsEnv.global.ServerlessWrapper.serverless.service.functions.hello.environment.testEnvVar = 'some value';

        await LambdaWrapper.getWrapper('hello');

        expect(process.env).toHaveProperty('testEnvVar', 'some value');
      });
    });
  });
});
