/**
 * Created by Niels on 25/08/15.
 */
Template.login.onCreated(function() {
    Session.setDefault('first-login', false);
    Session.setDefault('error-text', '');
    Meteor.call('firstLogin', function(error, result) {
        if(!error) {
            Session.set('first-login', result);
        }
    })
});

Template.login.events({
    'submit .login':function(event) {
       event.preventDefault();
       Meteor.loginWithPassword(event.target.username.value, event.target.password.value, function(err) {
           if(err) {
               Session.set('error-text', 'Wrong username or password');
           }
           else {
               Session.set('error-text', '');
           }
       });
    },

    'submit .createUser':function(event) {
        event.preventDefault();
        if(event.target.firstPassword.value === event.target.repeatPassword.value) {
            Accounts.createUser({username:event.target.username.value, password:event.target.firstPassword.value}, function(err) {
                if(err) {
                    Session.set('error-text', 'Error creating user');
                }
                else {
                    Session.set('first-login', false);
                }
            });
        }
        else {
            Session.set('error-text', 'Password does not match');
        }
    }
});

Template.login.helpers({
    firstLogin:function() {
        return Session.get('first-login');
    },

    errorText:function() {
        return Session.get('error-text');
    }
});

Template.admin.onCreated(function() {
    var instance = this;

    instance.subscribe('sensors');
    Session.set('checkedSensors', []);
    Session.setDefault('selected', 'Temperature');
    Session.setDefault('fromDate', new Date(0));
    Session.setDefault('toDate', undefined);
    instance.autorun(function () {
        instance.subscribe('sensorData', Session.get('fromDate'), Session.get('toDate'), Session.get('checkedSensors'));
    });
});

Template.admin.events({
    'click .logout':function() {
        Meteor.logout();
    },

    'submit .addSensor':function(event) {
        event.preventDefault();
        if(event.target.location.value !== '') {
            var radioButtons = event.target.type;
            var type;
            for(var i=0; i < radioButtons.length; i++) {
                if(radioButtons[i].checked) {
                    type = radioButtons[i].value;
                }
            }
            Meteor.call('addSensor', event.target.location.value, type);
            event.target.location.value = "";
        }
    },

    'keyup .dateInput':function(event) {
        var date = new Date(event.target.value);
        if(!isNaN(date.getTime())) {
            Session.set(event.target.name, date);
        }
        else if(event.target.value === '') {
            if(event.target.name === 'toDate') {
                Session.set(event.target.name, undefined);
            }
            else {
                Session.set(event.target.name, new Date(0));
            }
        }
    },

    'click .sensorCheckbox':function(event) {
        var array = Session.get('checkedSensors');
        if(event.target.checked) {
            if(array.indexOf(this._id) === -1) {
                array.push(this._id);
                Session.set('checkedSensors', array);
            }
        }
        else {
            var index = array.indexOf(this._id);
            if(index !== -1) {
                array.splice(index, 1);
                Session.set('checkedSensors', array);
            }
        }
    }
});

Template.admin.helpers({
    sensors:function() {
        return Sensors.find();
    },
    sensorData:function() {
        return SensorData.find({}, {sort:{start:-1}});
    },

    sortedData:function(data) {
        try {
            return data.sort(function (a, b) {
                return b.date - a.date;
            });
        }
        catch(error) {
            console.log(error)
        }
    },

    sensorName:function(id) {
        try {
            return Sensors.findOne({_id: id}).location;
        }
        catch(exception) {
            console.log(exception);
        }
    },

    dateFromTime:function(time) {
        var date = new Date();
        date.setTime(time);
        return date.toUTCString();
    }
});