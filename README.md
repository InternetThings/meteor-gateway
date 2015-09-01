# README #

### What is this repository for? ###

* This is the repository for the meteor/DDP sensor gateway solution. In it's current state it allows for creating of sensors via the website, while also allowing for presentation and filtration of data in real time. 
* Version 1.0

### How do I get set up? ###

* This setup helps you through getting raspberry pi setup with the necessary dependencies, and how to set up an auto-run once the project has been configured.

**Configuration**

* Computer:
* * First you will need to install meteor on your computer, guide can be found [here](https://www.meteor.com/install).
* * The easiest way to run the app is to download the source, cd into it, and run the "meteor" command and it will run on port 3000.
* * To build the source for use on the raspberry cd into the project directory and use the command "meteor build path" where path is the output directory. 

* Raspberry:
* * First  you will need a raspberry pi with the basic raspbian installed. A guide can be found [here](https://www.raspberrypi.org/documentation/installation/installing-images/).
* * On the first config make sure to expand the filesystem, enabling ssh might be a good idea as you will need to transfer files from your computer to the raspberry pi.
* * Next you need to install node, npm and mongodb. This is done via this script //link to script goes here//
* * Just move the script to your raspberry pi, make it executable with chmod +x ./meteor_installer.sh and run it by invoking the filepath. The install will take a couple of minutes.
* * Next step is to move the built project from your computer to the raspberry, to run the project all you need to is then use the [meteor_run.sh](http://script) script to run it. Keep in mind that the -d and -n options must be set, with -d being the path to the zipped project and -n being the name of the project, in this case it will be SensorGateway. On the first run the script will first setup your project which will take a bit of time, on each successive run it will be much faster.

* Database configuration
* * The database will be configured by the script and code itself. 
* * Slight note on [database design](http://design).

* Setting up execution on raspberry startup
* * To set up the raspberry so it will automatically run the server whenever it is started you have to edit the /etc/rc.local file. Simply add the line "sudo ./meteor_run.sh -d path -n SensorGateway" below the initial comments, path is the path to your project directory. 


### Who do I talk to? ###

* For further instructions contact ncfjakobsen@me.com