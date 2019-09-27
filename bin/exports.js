#!/usr/bin/env node

let AppExports = require('../lib/AppExports'),
    yargs = require('yargs')
        .usage('Export CloudFormation parameters in a format appropriate for consuming in the web application.\nUsage: $0')
        .alias('H', 'help')
        .describe('help', 'Print usage and quit.')
        .describe('appName', 'Name of the application from the parameters, used with environment to find exports specific to this application.')
        .demandOption('appName')
        .describe('environment', 'Environment to deploy stack to')
        .default('environment', '')
        .alias('o', 'output')
        .describe('output', 'Output file in json format')
        .default('output', "./exports.json")
        .alias('d', 'dump')
        .describe('dump', 'Dump to console, don\'t write to a file.')
        .boolean('dump')
        .alias('p', 'pretty')
        .describe('pretty', 'Format the output with tabs')
        .boolean('pretty'),
    argv = yargs.argv;

if (argv.H) {
    yargs.showHelp();
    process.exit(0);
}

let appExports = new AppExports();

appExports.fetch(argv.appName, argv.environment).then((exports) => {
    if(argv.dump) {
        var formatted = JSON.stringify(exports, null, '\t');

        console.log(formatted);
    } else {
        exports.write(argv.output, argv.pretty);
    }
});