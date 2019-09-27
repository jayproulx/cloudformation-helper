
const { SSM } = require('aws-sdk');

let ssm = new SSM({
    apiVersion: '2014-11-06',
    region: 'us-east-1'
});

class SSMParameter {
    name;
    value;
    type;
    description;
    helper;

    constructor(helper, name, value, type, description) {
        this.helper = helper;
        this.name = name;
        this.value = value;
        this.type = type;
        this.description = description;
    }

    put() {
        let formattedParameter = {
            Name: `/${this.helper.getParameterValue("AppName")}/${this.helper.getParameterValue("Environment")}/${this.name}`,
            Type: this.type,
            Value: this.value,
            Description: `${this.helper.getParameterValue("AppName")} ${this.helper.getParameterValue("Environment")} ${this.description}`,
            Overwrite: true
        };

        console.log(`Putting ${formattedParameter.Name}`);

        let request = ssm.putParameter(formattedParameter);

        return request.promise();
    }

    static putAll(parameters) {
        console.log("Putting all parameters");

        return parameters.reduce((promise, item) => {
            return promise
                .then((result) => {
                    return item.put();
                })
                .catch(console.error);
        }, Promise.resolve());
    }
}

module.exports = SSMParameter;