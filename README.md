# CloudFormation Helper

version: 0.0.6 

Providing the boiler plate for your AWS Application CloudFormation templates.

Building large scale AWS Applications requires careful consideration in the usage and versioning of provisioned 
resources.

### Prerequisites

* Node.js >=v0.12

### TL;DR

For your project, you can install cloudformation-helper to use in Node.js build scripts.  Maintain persistent application
parameters across your templates (such as Application Name and Environment, more on that in an upcoming blog post).

```bash
# npm install --save-dev cloudformation-helper
```

```JavaScript
const { ApplicationParameters, CloudFormationHelper, AppExports } = require('cloudformation-helper');

// see example.parameters.json which can also contain tokens that can be programmatically populated later
let parametersFile = "./examples/example.parameters.json";
let templateFile = "./examples/example.uber-stack.yml";
let environment = "Dev";
let stack = "MySQSStack";

let params = new ApplicationParameters({
    allowEmptyTokens: true,
    stripEmptyParameters: true,
    parametersFile: parametersFile,
    keys: ["AppName", "Environment"],
    parameterTokens: {
        environment: environment
    }
});

let appName = params.getParameterValue("AppName");

// Applications usually mean deploying multiple instances in one or many accounts, each Application instance needs to
// be uniquely named.
let stackName = `${appName}${environment}${stack}`;
let helper = new CloudFormationHelper(stackName, templateFile, params);

// maybe you need to get an existing AWS resource during your build, like perhaps an S3 bucket to fill with the 
// current versions of templates that you'll refer to in a nested stack.  We will need to know which copy of that
// bucket to get based on Application Name and Environment.  AppExports will remove the AppName and Environment prefix
// from each export so that we can refer to it generically in any copy of the application within the account.
var props = new AppExports();

props.fetch(appName, environment).then((exports) => {
    let bucket = exports["StackBucket"];

    // upload the child templates to the S3 bucket (from CICD stack) before running the create action, or after
    // other CLI build steps that you might have
    execSync(`aws s3 cp --recursive examples s3://${bucket}`);

    helper.create();
});
```

There are also command line tools installed here, specifically `cfn-exports` which will produce a JSON version of your
CloudFormation template exports that you can bundle with your project, which can provide useful properties like API
Gateway endpoints, S3 bucket names, or other values that you might want to programatically interact with.

```bash
# npm install -g cloudformation-helper
# cfn-exports --help
# cfn-exports --appName MyApp --environment Prod -o aws-environment.json --pretty
```

## Versioning

We use [generate-release](https://github.com/mrkmg/node-generate-release) for versioning. For the versions available, see the [tags on this repository](https://github.com/jayproulx/cloudformation-helper/releases). 

## Authors

* **Jay Proulx** - *Initial work* - [jayproulx](https://github.com/jayproulx)

See also the list of [contributors](https://github.com/jayproulx/cloudformation-helper/graphs/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details