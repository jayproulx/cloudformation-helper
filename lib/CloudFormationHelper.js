const {execSync} = require("child_process");
const {CloudFormation} = require('aws-sdk');
const Log4JS = require('log4js');

class CloudFormationHelperOptions {
    /**
     * log4js log level
     */

    logLevel = "info";

    /**
     * Wait until the requested operations are complete
     *
     * @type {boolean}
     */
    wait = false;

    constructor(logLevel, wait) {
        this.logLevel = logLevel;

        if(wait !== undefined) {
            this.wait = wait;
        }
    }
}

class CloudFormationHelper {
    logger = Log4JS.getLogger(CloudFormationHelper.name);

    /**
     * Manage CloudFormation based on certain persistent ApplicationParameters.
     *
     * @param stackName: (required) The name of the stack that we will manipulate
     * @param template: (required) Path to your template JSON or YAML
     * @param parameters: (required) An ApplicationParameters object
     * @param options: (optional) CloudFormationHelperOptions object, or a POJSO with the same properties.
     */
    constructor(stackName, template, parameters, options) {
        this.stackName = stackName;
        this.template = template;
        this.parameters = parameters;
        this.options = options === undefined ? new CloudFormationHelperOptions() : options;

        this.logger.level = 'info';

        if(this.options.logLevel !== undefined) {
            this.logger.level = options.logLevel;
        }
    }

    cli(command) {
        this.logger.info(command);
        execSync(command, {stdio: [0, 1, 2]});
    }

    quietCli(command) {
        this.logger.info(command);
        return execSync(command);
    }

    stackAction(action) {
        if (action === 'delete') {
            this.deleteStack();
        } else if(action === 'recreate') {
            this.recreateStack();
        } else if(action === 'create') {
            this.createStack();
        } else if(action === 'createChangeSet') {
            this.createChangeSet();
        } else if(action === 'executeChangeSet') {
            this.executeChangeSet();
        } else if(action === 'update') {
            this.updateStack();
        } else if(action === 'deploy') {
            this.deployStack(this.flatParametersAsString);
        }
    }

    deleteStack() {
        this.cli(`aws cloudformation delete-stack --stack-name ${this.stackName} --client-request-token ${new Date().getTime()}`);

        if(this.options.wait) {
            this.waitForDeleteStack(this.stackName);
        }
    }

    waitForDeleteStack() {
        this.cli(`aws cloudformation wait stack-delete-complete --stack-name ${this.stackName}`);
    }

    waitForUpdateStack() {
        this.cli(`aws cloudformation wait stack-update-complete --stack-name ${this.stackName}`);
    }

    waitForCreateStack() {
        this.cli(`aws cloudformation wait stack-create-complete --stack-name ${this.stackName}`);
    }

    waitForCreateChangeSet() {
        let changeSetName = this.getChangeSetName(this.stackName);

        this.cli(`aws cloudformation wait change-set-create-complete --change-set-name ${changeSetName} --stack-name ${this.stackName}`);
    }

    recreateStack() {
        this.deleteStack(this.stackName);
        this.createStack(this.stackName, this.template, this.parameters.getParameterStr);
    }

    createStack() {
        this.cli(`aws cloudformation create-stack --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --stack-name ${this.stackName} --template-body file://${this.template} --parameters "${this.parameters.cliParametersString()}" --client-request-token ${new Date().getTime()}`);

        if(this.options.wait) {
            this.waitForCreateStack(this.stackName);
        }
    }

    updateStack() {
        try {
            this.cli(`aws cloudformation update-stack --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --stack-name ${this.stackName} --template-body file://${this.template} --parameters "${this.parameters.cliParametersString()}" --client-request-token ${new Date().getTime()}`);

            if(this.options.wait) {
                this.waitForUpdateStack(this.stackName);
            }
        } catch( e) {
            this.logger.info("Everything is PROBABLY fine, just no updates to apply, hard to tell a real failure from a no-op");
        }
    }

    deployStack(){
        try {
            this.cli(`aws cloudformation deploy --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --stack-name ${this.stackName} --template-file ${this.template} --parameter-overrides ${this.parameters.cliParametersString()}`);
        } catch( e) {
            this.logger.info("Everything is PROBABLY fine, just no updates to apply, hard to tell a real failure from a no-op");
        }
    }

    createChangeSet(generateOnly) {
        let generateArg = generateOnly ? "--generate-cli-skeleton output" : "";
        let changeSetName = this.getChangeSetName(this.stackName);

        this.cli(`aws cloudformation create-change-set --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND --stack-name ${this.stackName} --template-body file://${this.template} --parameters "${this.parameters.cliParametersString()}" --change-set-name ${changeSetName} ${generateArg}`);

        if(!generateOnly) {
            this.logger.info(`You can nowcloudformation execute-change-set --change-set-name ${changeSetName} --stack-name ${this.stackName}`);
        }

        if(this.options.wait) {
            this.waitForCreateChangeSet(stackName);
        }

        return changeSetName;
    }

    getChangeSetName() {
        return `${this.stackName}-latest`;
    }

    confirmChangeSet() {
        let changeSetName = this.getChangeSetName(this.stackName);

        let stdout = this.quietCli(`aws cloudformation describe-change-set --stack-name ${this.stackName} --change-set-name ${changeSetName}`);

        return JSON.parse(stdout.toString());
    }

    executeChangeSet() {
        let changeSetName = this.getChangeSetName(this.stackName);

        let description = this.confirmChangeSet(this.stackName);

        if(description.Status !== "FAILED") {
            this.cli(`aws cloudformation execute-change-set --change-set-name ${changeSetName} --stack-name ${this.stackName} --client-request-token ${new Date().getTime()}`);
        }
        else {
            this.logger.info(description.StatusReason)
        }
    }
}

module.exports = {
    CloudFormationHelper: CloudFormationHelper,
    CloudFormationHelperOptions: CloudFormationHelperOptions
};

