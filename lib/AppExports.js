#!/usr/bin/env node

const fs = require('fs'),
    { CloudFormation } = require('aws-sdk'),
    Log4JS = require('log4js');

class AppExports {
    logger = Log4JS.getLogger(AppExports.name);

    /**
     * Instance of CloudFormation for fetching exports
     *
     * @type {CloudFormation}
     */
    cloudformation;

    /**
     * AWS Region defaults to us-east-1
     *
     * @type {string}
     */
    region = 'us-east-1';

    constructor(region) {
        this.region = region || this.region;

        this.cloudformation = new CloudFormation({
            apiVersion: '2010-05-15',
            region: this.region
        });
    }

    async fetch(appName, environment) {
        return new Promise((resolve, reject) => {

            this.cloudformation.listExports({}, (err, data) => {
                let exportKey = `${appName}${environment}`;

                if (err) {
                    this.logger.error(err, data);

                    reject(err);

                    return;
                }

                let exports = {};

                for (let prop of data.Exports) {
                    if (!prop.Name.startsWith(exportKey)) continue;

                    exports[prop.Name.replace(exportKey, '')] = prop.Value;
                }

                resolve(exports);

            });
        });
    }

    static write(outputFile, pretty=true) {
        let formatted = (pretty) ? JSON.stringify(exports, null, '\t') : JSON.stringify(exports);

        fs.writeFileSync(outputFile, formatted);
    }
}

module.exports = AppExports;