# README #

### What is this repository for? ###

* This is the repository for the meteor/DDP sensor gateway solution. In it's current state it allows for creating of sensors via the website, while also allowing for presentation and filtration of data in real time. 
* Version 1.0

### How do I get set up? ###

* This setup helps you through getting raspberry pi setup with the necessary dependencies, and how to set up an auto-run once the project has been configured.

**Configuration**

* Raspberry:
* * First  you will need a raspberry pi with the basic raspbian installed. A guide can be found here [here](https://www.raspberrypi.org/documentation/installation/installing-images/).
* * On the first config make sure to expand the filesystem, enabling ssh might be a good idea as well as you will need to transfer files from your computer to the raspberry pi.
* * Next you need to install node, npm and mongodb. This is done via this script //link to script goes here//
* * Just move the script to your raspberry pi, make it executable with chmod +x ./meteor_installer.sh and run it by invoking the filepath. The install will take a couple of minutes


* Computer:
* * First you will need to install meteor on your computer, guide can be found here [here]https://www.meteor.com/install).
* * The easiest way to run the app is to download the source, cd into it, and run the meteor command and it will run on port 3000.

* Dependencies
* Database configuration
* How to run tests
* Deployment instructions

### Who do I talk to? ###

* For further instructions contact ncfjakobsen@me.com