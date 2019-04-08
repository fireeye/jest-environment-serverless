/* Copyright (C) 2019 FireEye, Inc. All Rights Reserved. See LICENSE file. */

const path = require('path');

const lambdaWrapper = jest.requireActual('lambda-wrapper');

global.LambdaWrapper = {
  async getWrapper(functionName) {
    const { rootDir, serverless } = ServerlessWrapper;

    const func = serverless.service.getFunction(functionName);
    const [handlerFile, handler] = func.handler.split('.');

    const mod = jest.requireActual(path.join(rootDir, handlerFile));

    const wrapped = lambdaWrapper.wrap(mod, {
      handler,
    });
    // Make sure this methods env vars take priority
    ServerlessWrapper.setEnv(functionName);

    return wrapped;
  },
};
