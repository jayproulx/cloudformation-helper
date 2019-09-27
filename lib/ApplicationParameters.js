class ApplicationParameters {
    /**
     * If a token is required for a parameter value, but there is no value, continue processing, otherwise throw an error if false.
     */
    allowEmptyTokens;

    /**
     * If a parameter value is empty, remove it from the list of parameters sent to cloudformation
     */
    stripEmptyParameters;

    /**
     * A POJO in AWS Parameter JSON format (array of objects with ParameterKey and ParameterValue keys)
     */
    parameters;

    /**
     * A file to load parameters from, in AWS Parameter JSON format (array of objects with ParameterKey and ParameterValue keys)
     */
    parametersFile;

    /**
     * A simple map that will be used to replace tokens in ParameterValue's
     */
    parameterTokens;

    /**
     * The list of keys from the parameters object, ignore all others.
     */
    keys;

    constructor(options) {
        if (options.keys) {
            this.keys = options.keys;
        }

        if (options.parameterTokens) {
            this.parameterTokens = options.parameterTokens;
        }

        if (options.stripEmptyParameters) {
            this.stripEmptyParameters = options.stripEmptyParameters;
        }

        if (options.allowEmptyTokens) {
            this.allowEmptyTokens = options.allowEmptyTokens;
        }

        if (options.parameters !== undefined) {
            this.parameters = this.replaceParameterTokens(options.parameters);
        }

        if (options.parametersFile) {
            this.loadParametersFromFile(options.parametersFile);
        }
    }

    replaceParameterTokens(params) {
        let newParams = JSON.parse(JSON.stringify(params));

        if (!this.parameterTokens) {
            throw new Error("No parameter tokens to retrieve values from, please set parameterTokens in options");
        }

        for (let i = 0; i < newParams.length; i++) {
            let v = params[i].ParameterValue;
            let token = /\${(.*?)}/;
            let tokenMatch = v.match(token);

            while (tokenMatch) {
                try {
                    let val = this.parameterTokens[tokenMatch[1]] || '';

                    if (!val) {
                        console.warn(`Couldn't find a value for ${tokenMatch[0]} in ${params[i].ParameterKey}`);

                        if (!this.allowEmptyTokens) {
                            throw new Error("Emtpy tokens are not allowed, set allowEmptyTokens to true to continue.");
                        }
                    }

                    v = v.replace(token, val);
                } catch (error) {
                    throw new Error(`Error replacing token in parameters: ${error}`);
                }

                newParams[i].ParameterValue = v;

                tokenMatch = v.match(token);
            }
        }

        return newParams;
    }

    get flatParameters() {
        let flat = {};

        for (let i = 0; i < this.parameters.length; i++) {
            let param = this.parameters[i];

            flat[param.ParameterKey] = param.ParameterValue;
        }

        return flat;
    }

    get flatParametersAsString() {
        let params = "";

        for (let param in this.flatParameters) {
            if(!this.flatParameters.hasOwnProperty(param)) continue;

            params += `${param}=${this.flatParameters[param]} `;
        }

        return params;
    }

    /**
     * Format parameters into a string that is an acceptable input format for the AWS CloudFormation CLI
     *
     * @param params
     * @returns {string}
     */
    cliParametersString(params) {
        params = params || this.parameters;

        return JSON.stringify(params).split('"').join('\\\"');
    }

    /**
     * Load parameters from a file, and persist them in this helper.  (see #getParametersFromFile)
     * @param {string} path
     */
    loadParametersFromFile(path) {
        this.parametersFile = path;
        this.parameters = this.getParametersFromFile(path);
    }

    /**
     * Load parameters from an appropriately formatted file [{"ParameterKey": "thekey", "ParameterValue": "thevalue"},...], apply stripEmptyParameters and filterParametersByKey filters and return the
     * remaining parameters.
     * @param {string} path
     * @returns {object}
     */
    getParametersFromFile(path) {
        let absolutePath = `${path}`;
        let params = require(absolutePath);

        // this.logger.debug(`Using parameters file  ${absolutePath}`);

        if (!params) {
            throw new Error(`No parameters found in ${absolutePath}`);
        }

        if (this.keys) {
            params = this.filterParametersByKey(this.keys, params);
        }

        params = this.replaceParameterTokens(params);

        if (this.stripEmptyParameters) {
            params = params.filter(ApplicationParameters.stripEmptyParametersFilter);
        }

        return params;
    }

    static stripEmptyParametersFilter(param) {
        return param.ParameterValue !== '';
    }

    getParameterValue(key, params) {
        params = params || this.parameters;

        if (params === undefined) {
            return undefined;
        }

        for (let i = 0; i < params.length; i++) {
            let param = params[i];
            if (param.ParameterKey === key) {
                return param.ParameterValue;
            }
        }

        return undefined;
    }

    filterParametersByKey(keys, params) {
        params = params || this.parameters;

        if (params === undefined) {
            throw new Error("filterParametersByKey params, or helper parameters must not be null");
        }

        return params.filter((param) => keys.indexOf(param.ParameterKey) > -1);
    }
}

module.exports = ApplicationParameters;