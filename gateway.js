/**
 * Created by Niels on 13/08/15.
 */
TempData = new Mongo.Collection('items');
Notifications = new Mongo.Collection('notifications');

if(Meteor.isClient) {
    Template.gateway.onCreated(function() {
        this.subscribe('recent-notifications');
    });

    Template.gateway.helpers({
        notifications: function() {
            var startDate = new Date();
            startDate.setMinutes(startDate.getMinutes()-30);
            return Notifications.find();
        }
    });

    Template.gateway.events({
        'click .dismiss-notification': function () {
            Meteor.call('dismissNotification', this._id, function() {
                //Do nothing
            });
        }
    })
}
if(Meteor.isServer) {
    Meteor.publish('recent-notifications', function() {
        var startDate = new Date();
        startDate.setMinutes(startDate.getMinutes()-30);
        return Notifications.find({date: {$gte:startDate}, dismissed:false});
    });

    Meteor.startup(function() {
    });

    Meteor.methods({
        insertTemp: function(data) {
            if(Array.isArray(data)) {
                for(var i = 0; i < data.length; i++) {
                    TempData.insert({startTemperature: data[i].temperature, location: data[i].location});
                }
            }
            else {
                TempData.insert({startTemperature: data.temperature, location: data.location});
            }
        },

        numOfData: function() {
            return TempData.find({}).count();
        },

        incrementData: function(data) {
            var startDate = new Date();
            startDate.setMinutes(startDate.getMinutes()-30);
            var endDate = new Date();
            if(Array.isArray(data)) {
                for(var i = 0; i < data.length; i++) {
                    TempData.update({_id: data[i].id}, {$push: {temperatureChanges:{change:data[i].change, date:data[i].date}}});
                    var currentSensor = TempData.findOne({_id: data[i].id});
                    Meteor.call('getCurrentTemperature', currentSensor._id, function(error, result) {
                        if((result > 50 || result < 0) && Notifications.find({location: currentSensor.location, date: {$gte: startDate, $lt: endDate}}).count() === 0) {
                            Notifications.insert({location:currentSensor.location, date: endDate, reading:result, dismissed: false});
                        }
                    });
                }
            }
            else {
                TempData.update({_id: data.id}, {$push: {temperatureChanges:{change:data.change, date:data.date}}});
                var currentSensor = TempData.findOne({_id: data.id});
                var temperature = Meteor.call('getCurrentTemperature', currentSensor._id, function(error, result) {
                    if((result > 50 || result < 0) && Notifications.find({location: currentSensor.location, date: {$gte: startDate, $lt: endDate}}).count() === 0) {
                        Notifications.insert({location:currentSensor.location, date: endDate, reading:result, dismissed: false});
                    }
                });
            }
        },

        getIds: function() {
            return TempData.find({}).fetch();
        },

        getCurrentTemperature: function(id) {
            var sensor = TempData.findOne({_id:id});
            var totalTemperature = sensor.startTemperature;
            if(sensor.temperatureChanges !== null) {
                for (var i = 0; i < sensor.temperatureChanges.length; i++) {
                    totalTemperature += sensor.temperatureChanges[i].change;
                }
            }
            return totalTemperature;
        },

        dismissNotification: function(id) {
            Notifications.update({_id:id}, {$set: {dismissed: true}});
        }
    });
}