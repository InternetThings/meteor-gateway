/**
 * Created by Niels on 01/09/15.
 */
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

server.on('clientConnected', function(client) {
   console.log('client connected', client.id);
});

server.on('published', function(packet, client) {
   //console.log('Published', packet.topic);
});

server.on('ready', setup);

function setup() {
    console.log('Mosca is up and running');
}