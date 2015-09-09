/**
 * Created by Niels on 01/09/15.
 */
//Array of all versions, format is {versions:[{topic:String, subscribers:Number}], regex:RegExp, function:Function}
Topics = [];

//Observer variable, used for saving mongoDB observer
var observer = undefined;

//Regex patterns for use in validating subscription
var pattern = /sensors:\[((,\s)?\w+)*](\/data:\[[<>=]\d+(,\s[<>=]\d+)?])?/;
var vals = /(:\[(((,\s)?\w+)*)])|(:\[[<>=]\d+(,\s[<>=]\d+)?])/g;
var exps = /[<>=]\d+/g;
var strings = /\w+/g;

//Instantiating mosca broker
var mosca = Meteor.npmRequire('mosca');

//Setting up broker
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

//Instantiating server
var server = new mosca.Server(settings);

var authenticate = Meteor.bindEnvironment(function(client, username, password, callback) {
    var matchingUser = Meteor.users.find({username:username});
    if(matchingUser.count() > 0) {
        var check = Accounts._checkPassword(matchingUser.fetch()[0], password.toString('utf8'));
        if (check.error) {
            callback(check.error);
        }
        else {
            callback(null, true);
        }
    }
});

//Authorization method to make sure only the server can publish
var authorizePublish = function(client, topic, payload, callback) {
    callback(null, client === null);
};

//Authorization method to make sure there are only subscribers on correctly formatted topics
var authorizeSubscribe = function(client, topic, callback) {
    var match = topic.match(pattern);
    callback(null, (match !== null && match[0] === topic));
};

server.on('clientConnected', function(client) {
   console.log("Connected");
});

server.on('clientDisconnected', function(client) {
    console.log("Disconnected")
});

//Check if topic match the pattern and create topic function if needed
server.on('subscribed', Meteor.bindEnvironment(function(topic, client) {
    console.log('Subscribed', topic);
    var index = topicIndex(topic);
    if(index.outer === -1) {
        Topics.push({versions: [{topic:topic, subscribers:1}], regex: topicRegex(topic), function: parseTopic(topic)});
        console.log('Topic created');
        //Start observer if it's not running
        if (observer === undefined) {
            startObserver();
            console.log('Observer started');
        }
    }
    else if(index.inner === -1) {
        Topics[index.outer].versions.push({topic:topic, subscribers:1});
    }
    else {
        Topics[index.outer].versions[index.inner].subscribers++;
    }
}));

//Unsubscribe from the topic, if there are not subscribers left, remove the topic from the versions array
server.on('unsubscribed', function(topic ,client) {
    console.log('Unsubscribed', topic);
    var index = topicIndex(topic);
    if(index.inner !== -1) {
        Topics[index.outer].versions[index.inner].subscribers--;
        if(Topics[index.outer].versions[index.inner].subscribers === 0) {
            Topics[index.outer].versions.splice(index.inner, 1)
        }
        if(Topics[index.outer].versions.length === 0) {
            Topics.splice(index.outer, 1);
            console.log('There are now ' + Topics.length + ' versions');
        }
    }
});

server.on('ready', setup);

function setup() {
    server.authenticate = authenticate;
    server.authorizePublish = authorizePublish;
    server.authorizeSubscribe = authorizeSubscribe;
    console.log('Mosca is up and running');
}

//Search function to find a topic object by topic string
//Order of sensor names and expressions doesn't matter
function topicIndex(topic) {
    var i = 0;
    var j = 0;
    var outerFound = false;
    var innerFound = false;
    while(!outerFound && i < Topics.length) {
        if(topic.match(Topics[i].regex) !== null) {
            outerFound = true;
            while(!innerFound && j < Topics[i].versions.length) {
                if(Topics[i].versions[j].topic === topic) {
                    innerFound = true;
                }
                else {
                    j++;
                }
            }
        }
        else {
            i++;
        }
    }
    if(!outerFound) {
        i = -1;
    }
    if(!innerFound) {
        j = -1;
    }
    return {outer:i, inner:j};
}

//Function for creating a regex to match a particular topic, used for handling topics with different order of sensors or expressions
function topicRegex(topic) {
    var regex = 'sensors:\\[';
    var values = topic.match(vals);
    var sensorsNames = values[0].match(strings);
    if(sensorsNames !== null) {
        for (var i = 0; i < sensorsNames.length; i++) {
            if (i !== 0) {
                regex += ', ';
            }
            regex += '(';
            for (var j = 0; j < sensorsNames.length; j++) {
                if (j !== 0) {
                    regex += '|';
                }
                regex += sensorsNames[j];
            }
            regex += ')';
        }
    }
    regex += ']';
    if(values.length > 1) {
        regex += '\\/data:\\[';
        var expressions = values[1].match(exps);
        for(var i = 0; i < expressions.length; i++) {
            if(i !== 0) {
                regex += ', ';
            }
            regex += '(';
            for(var j = 0; j < expressions.length; j++) {
                if(j !== 0) {
                    regex += '|';
                }
                regex += expressions[j];
            }
            regex += ')';
        }
        regex += ']';
    }
    console.log(regex);
    return new RegExp(regex);
}

//Topic pattern sensors:[]/data:[<0]
//Function for parsing a topic and creating a function for handling changes
function parseTopic(topic) {
    //Find the values in the topic string
    var values = topic.match(vals);
    console.log(values);
    //Extract the sensors names and build a regex for getting sensorIds
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
    //Extract expressions from values
    var expressions = null;
    if(values.length > 1) {
        expressions = values[1].match(exps);
    }
    //Create function that will return true if the data matches the topic, or false if not
    var topicFunction = function (data) {
        var matches = false;
        if(sensorIds.length === 0 || sensorIds.indexOf(data.sensorId) !== -1) {
            matches = true;
            if(expressions !== null) {
                for (var i = 0; i < expressions.length; i++) {
                    //Switch for handling expressions
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

//Start observer and assign it to the observer variable, observer checks new data and publishes it to the relevant versions
function startObserver() {
    //Initializing variable, makes sure initial load is not published
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
                        for(var j = 0; j < Topics[i].versions.length; j++) {
                            var message = {
                                topic: Topics[i].versions[j].topic,
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
                        for(var j = 0; j < Topics[i].versions.length; j++) {
                            var message = {
                                topic: Topics[i].versions[j].topic,
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
        }
    });
    initializing = false;
}
