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
    }
});

Template.admin.helpers({
    sensors:function() {
        return Sensors.find();
    }
});