/**
 * Created by Niels on 25/08/15.
 */
var mqtt = Meteor.npmRequire('mqtt');
var client = client = mqtt.connect('mqtt://localhost');

function publishData(data) {
    console.log('Published data');
    var sensorName = Sensors.findOne({_id:data.sensorId}).location;
    var message = 'Readiing @' + new Date(data.date).toUTCString() + " = " + data.data;
    client.publish('sensors/' + sensorName, message);
}

Meteor.startup(function() {
    //No particular setup on startup
});

//Publish the sensors collection to all logged in users
Meteor.publish('sensors', function() {
    if(this.userId) {
        return Sensors.find();
    }
    else {
        this.ready();
    }
});

//Public functions
Meteor.methods({
    //Create a new sensor of a specific type
    addSensor:function(location, type) {
        check(location, String);
        check(type, String);
        if(this.userId) {
            Sensors.insert({location:location, type:type});
        }

    },

    //Function to check wether an admin user has been created
    firstLogin:function(id) {
        return Meteor.users.find().count() === 0;
    },

    //Temporary function for getting all sensor ids, will be removed for final product
    getIds:function() {
        return Sensors.find({}, {fields: {type: 1}}).fetch();
    },

    //Temporary function for adding data to sensor, will be removed for final product
    addData:function(data) {
        var currentData = SensorData.findOne({end: undefined});
        if (currentData !== undefined) {
            //Append the current data
            var setQuery = {};
            setQuery['data.' + currentData.currentIndex + '.date'] = data.date;
            setQuery['data.' + currentData.currentIndex + '.sensorId'] = data.sensorId;
            setQuery['data.' + currentData.currentIndex + '.data'] = data.data;
            SensorData.update({end: undefined}, {$set: setQuery, $inc: {currentIndex: 1}});
            if (SensorData.findOne({end: undefined, currentIndex: 100}) !== undefined) {
                SensorData.update({end: undefined}, {$set: {end: data.date}});
            }
        }
        else {
            //Create new data document
            var dataArray = [];
            dataArray.push(data);
            for (var i = 0; i < 99; i++) {
                dataArray.push({date: undefined, sensorId: undefined, data: undefined});
            }
            SensorData.insert({start: data.date, end: undefined, currentIndex: 0, data: dataArray});
        }
        publishData(data);
    }
});