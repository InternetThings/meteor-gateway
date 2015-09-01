/**
 * Created by Niels on 25/08/15.
 */
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

//Publish sensor data for logged in users, based on their search criteria
Meteor.publish('sensorData', function(from, to, sensors) {
    if(this.userId) {
        //Function for filtering sensor data based on search criteria
        var transform = function (data) {
            if (to !== null) {
                var index = 0;
                var dataArray = [];
                while (index < data.currentIndex && data.data[index].date <= to.getTime()) {
                    if(sensors !== null) {
                        if (sensors.indexOf(data.data[index].sensorId) !== -1) {
                            dataArray.push(data.data[index]);
                        }
                    }
                    else {
                        dataArray.push(data.data[index]);
                    }
                    index++;
                }
                data.data = dataArray;
            }
            else {
                var index = 0;
                var array = [];
                while(index < data.data.length) {
                    if(sensors !== null) {
                        if (sensors.indexOf(data.data[index].sensorId) !== -1) {
                            array.push(data.data[index]);
                        }
                    }
                    index++;
                }
                data.data = array;
            }
            return data;
        };

        var self = this;

        //Set up observer with the transform function
        var observer = SensorData.find({start: {$gte: from.getTime()}}).observe({
            added: function (data) {
                self.added('sensorData', data._id, transform(data));
            },
            changed: function (newData, oldData) {
                self.changed('sensorData', oldData._id, transform(newData));
            },
            removed: function (oldData) {
                self.removed('sensorData', oldData._id);
            }
        });

        //Stop observer when subscription is cancelled
        self.onStop(function () {
            observer.stop()
        });
    }

    //Notify subscriber that subscription is ready
    self.ready();
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
    }
});