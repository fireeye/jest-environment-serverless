# jest-environment-serverless

Run your [Serverless](https://serverless.com) tests using Jest, quickly and easily! This project exposes a [Lambda Wrapper](https://github.com/nordcloud/lambda-wrapper) to your tests in order to make it effortless and easy to test your lambdas.

Installing is as easy as:

```shell
npm install serverless jest jest-environment-serverless
```

## Usage

Update your Jest configuration to set the [testEnvironment](https://jestjs.io/docs/en/configuration#testenvironment-string) to `jest-environment-serverless`:

```json
{
  ...
  "testEnvironment": "jest-environment-serverless"
}
```

Use Serverless in your tests:

```javascript
describe('Hello Lambda', () => {
  let wrapper;

  beforeAll(async () => {
    wrapper = await LambdaWrapper.getWrapper('hello');
  });

  it('says hello', async () => {
    const event = { name: 'Bob' };
    const response = await wrapper.run(event);
    expect(response).toHaveProperty('message', 'Hi Bob!');
  });
});
```

## API

### `global.LambdaWrapper`

This global variable provides convenient access to the [lambda-wrapper](https://github.com/nordcloud/lambda-wrapper) module in order to simulate lambda executions for the given events and contexts, fully initialized with your `Serverless` configuration, providing a more accurate and thorough testing scenario than attempting to invoke and test your lambdas directly.

#### `getWrapper()`

When provided with a valid `Serverless` function name, `getWrapper` will return a configured, ready-to-run [lambda wrapper](https://github.com/nordcloud/lambda-wrapper).

With a simple `serverless.yml`
```yaml
service: jest-test-suite
provider:
  name: aws
  runtime: nodejs8.10
  region: us-east-1
  environment:
    STAGE: prod-stage-test
functions:
  hello:
    handler: handler.hello
    environment:
      HELLO: "world ${self:provider.region}"
```

You can obtain a reference to the `hello` lambda in order to simulate various conditions and assert the expected behaviors:

```javascript
describe('Hello Lambda', () => {
  let wrapper;

  beforeAll(async () => {
    wrapper = await LambdaWrapper.getWrapper('hello');
  });

  it('says hello', async () => {
    const event = { name: 'Bob' };
    const response = await wrapper.run(event);
    expect(response).toHaveProperty('message', 'Hi Bob!');
  });
});
```

### `global.ServerlessWrapper`

This global variable provides access to a number of properties that can be safely ignored in nearly all but the most challenging test scenarios. These are primarily used by the [LambdaWrapper](#global.LambdaWrapper) in order to discover the service and configuration for a given lambda during testing.

#### `Serverless`

This provides direct access to the `Serverless` class.

#### `rootDir`

Exposes the root directory used by `Serverless` to load the configuration and plugins from. By default, this value is set to the `cwd`.

#### `serverless`

This provides direct access to the initialized `Serverless` instance in case it is needed to help assert or verify anything during testing. With this, you can access:
- processed configuration
- loaded services
- loaded plugins
- variables

You can also dynamically modify the configuration or services to assist while testing, without needing to manage multiple test projects or copying files to temporary directories.

#### `getEnv()`

Exposes the environment variables for the function defined in your Serverless Configuration. For example:

With a simple `serverless.yml`
```yaml
service: jest-test-suite
provider:
  name: aws
  runtime: nodejs8.10
  region: us-east-1
  environment:
    STAGE: prod-stage-test
functions:
  hello:
    handler: handler.hello
    environment:
      HELLO: "world ${self:provider.region}"
```

Calling `getEnv` would return:
```javascript
// This is the name of the lambda declared in the "functions" block in the
// serverless.yml
const envVars = ServerlessWrapper.getEnv('hello');
assert.deepEqual(envVars, { HELLO: 'world us-east-1' });
```

#### `setEnv()`

Updates `process.env` with the environment variables for the function defined in your Serverless Configuration. For example:

With a simple `serverless.yml`
```yaml
service: jest-test-suite
provider:
  name: aws
  runtime: nodejs8.10
  region: us-east-1
  environment:
    STAGE: prod-stage-test
functions:
  hello:
    handler: handler.hello
    environment:
      HELLO: "world ${self:provider.region}"
  goodbye:
    handler: handler.goodbye
    environment:
      HELLO: "cruel world"
      GOODBYE: "world ${self:provider.region}"
```

Calling `setEnv` would return:
```javascript
// All serverless env vars are initially loaded, but lambda env vars are
// not prioritized and may override one another
assert.deepEqual(process.env, {
  ...
  HELLO: 'cruel world',
  GOODBYE: 'world us-east-1',
  ...
});
// This is the name of the lambda declared in the "functions" block in the
// serverless.yml
const envVars = ServerlessWrapper.setEnv('hello');

// The "hello" lambda env vars have been loaded and take priority over all
// others
assert.deepEqual(process.env, {
  ...
  HELLO: 'world us-east-1',
  GOODBYE: 'world us-east-1',
  ...
});
```

_Copyright (C) 2019 FireEye, Inc. All Rights Reserved. See LICENSE file._
