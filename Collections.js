/**
 * Created by Niels on 25/08/15.
 */
//All collections goes here
//Collection of all sensors registered on the server
Sensors = new Mongo.Collection('sensors');
//Collection of data collected by sensors registered on the server
SensorData = new Mongo.Collection('sensorData');