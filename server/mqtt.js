/**
 * Created by Niels on 01/09/15.
 */
//Array of all topics, format is {topic:String, function:Function}
Topics = [];

var observer = undefined;
var pattern = /sensors:\[((,\s)?\w+)*](\/data:\[[<>=]\d+(,\s[<>=]\d+)?])?/;
var vals = /(:\[(((,\s)?\w+)*)])|(:\[[<>=]\d+(,\s[<>=]\d+)?])/g;
var exps = /[<>=]\d+/g;
var strings = /\w+/g;
var mosca = Meteor.npmRequire('mosca');

var ascoltatore = {
    type: 'mongo',
    url: 'mongodb://localhost:3001/mqtt',
    pubsubCollection: 'ascoltatori',
    mongo: {}
};

var settings = {
    port: 1883,
    backend: ascoltatore,
    persistence: {
        factory: mosca.persistence.Mongo,
        url: 'mongodb://localhost:3001/mqtt'
    }
};

var server = new mosca.Server(settings);

server.on('subscribed', Meteor.bindEnvironment(function(topic, client) {
    console.log('Subscribed', topic);
    var match = topic.match(pattern);
    if(match !== null && match[0] === topic && topicIndex(topic) === -1) {
        Topics.push({topic:topic, function:parseTopic(topic)});
        console.log('Topic created');
        if(observer === undefined) {
            startObserver();
            console.log('Observer started');
        }
    }
}));

server.on('unsubscribed', function(topic ,client) {
    console.log('Unsubscribed', topic);
    var index = topicIndex(topic);
    if(index !== -1) {
        Topics.splice(index, 1);
        console.log('There are now ' + Topics.length + ' topics');
    }
});

server.on('ready', setup);

function setup() {
    console.log('Mosca is up and running');
}

function topicIndex(topic) {
    var i = 0;
    var found = false;
    while(!found && i < Topics.length) {
        if(Topics[i].topic === topic) {
            found = true;
        }
        else {
            i++;
        }
    }
    if(found) {
        return i;
    }
    else {
        return -1;
    }
}

//Topic pattern sensors:[]/data:[<0]
function parseTopic(topic) {
    var values = topic.match(vals);
    console.log(values);
    var sensorNames = values[0].match(strings);
    var regex = "";
    var sensorIds = [];
    if(sensorNames !== null) {
        for (var i = 0; i < sensorNames.length; i++) {
            if (i !== 0) {
                regex += "|";
            }
            regex += sensorNames[i];
        }
        sensorIds = Sensors.find({location: {$regex: regex}}, {fields:{location:0, type:0}}).map(function(sensor) {
            return sensor._id;
        });
    }
    var expressions = null;
    if(values.length > 1) {
        expressions = values[1].match(exps);
    }
    console.log(sensorIds);
    var topicFunction = function (data) {
        var matches = false;
        if(sensorIds.length === 0 || sensorIds.indexOf(data.sensorId) !== -1) {
            matches = true;
            if(expressions !== null) {
                for (var i = 0; i < expressions.length; i++) {
                    switch (expressions[i][0]) {
                        case '<': {if(data.data >= parseInt(expressions[i].substring(1))) {
                            matches = false;
                        }}
                            break;
                        case '>': {if(data.data <= parseInt(expressions[i].substring(1))) {
                            matches = false;
                        }}
                            break;
                        case '=': {if(data.data !== parseInt(expressions[i].substring(1))) {
                            matches = false;
                        }}
                            break;
                    }
                }
            }
        }
        return matches;
    };
    return topicFunction;
}

function startObserver() {
    var initializing = true;
    observer = SensorData.find({}, {fields:{currentIndex:1, data:1}}).observeChanges({
        added: function (id, fields) {
            if(!initializing) {
                if(Topics.length === 0) {
                    observer.stop();
                    observer = undefined;
                }
                var data = fields.data[fields.currentIndex-1];
                for (var i = 0; i < Topics.length; i++) {
                    if (Topics[i].function(data)) {
                        var message = {
                            topic: Topics[i].topic,
                            payload: "Registrered reading of " + data.data,
                            qos: 0,
                            retain: false
                        };
                        server.publish(message, function () {
                            console.log('Published!');
                        })
                    }
                }
            }
        },

        changed: function(id, fields) {
            if (!initializing) {
                if (Topics.length === 0) {
                    observer.stop();
                    observer = undefined;
                }
                var data = fields.data[fields.currentIndex - 1];
                for (var i = 0; i < Topics.length; i++) {
                    if (Topics[i].function(data)) {
                        var message = {
                            topic: Topics[i].topic,
                            payload: 'Registrered reading @' + data.sensorId + ' of ' + data.data,
                            qos: 0,
                            retain: false
                        };
                        server.publish(message, function () {
                            console.log('Published!');
                        })
                    }
                }
            }
        }
    });
    initializing = false;
}
