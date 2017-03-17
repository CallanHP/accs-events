# accs-events

Module providing a application-cluster event network for Oracle's Application Container Cloud Service.

## Table of Contents

+ [Installation](#installation)
+ [Simple Usage](#simple-usage)
+ [Offline Testing](#offline-testing) - i.e. Testing code not deployed to ACCS
+ [Full Documentation](#full-documentation)
	* [Constructor](#constructor)
 	* [Network.on()](#networkon)
 	* [Network.once()](#networkonce)
 	* [Network.fire()](#networkfire)
 	* [Network.unsubscribe()](#networkunsubscribe)
+ [Changelog](#changelog)

## Installation

```bash
$ npm install accs-events
```

## Simple Usage
This module is designed to abstract away the networking complexity of distributing events across each of the instances of an application, allowing code to add listeners for events in one instance, and have them resolved by an occurence in the same or another instance.
Sample usage is as follows (showing express-style syntax for a simple web endpoint):

```js
var EventNetwork = require('accs-events');

var eventNetwork = new EventNetwork();

//Add an event listener
eventNetwork.on('testLogging', function(message){
	console.log("Received a testLogging event, message was: " +message);
	});

//In another section of code, for instance an API invocation
app.get('/fireEvent', function(request, response){
	var message = req.query.message;
    if(!message){
      message = "Event with no message.";
    }
	eventNetwork.fire('testLogging', message);
	response.send("Event fired!");
});

```

In this example, it doesn't matter which instance of the application happens to accessed when a user accesses the /fireEvent endpoint, the 'testLogging' event is fired in every application instance, writing to each of the logs.

A simple express application to demonstrate event behaviour is available in the test folder of the module (or [here](https://github.com/CallanHP/accs-events/blob/master/test/sample-eventing-application.js) on github).

## Offline Testing

Since this module is designed to leverage specific behaviours of the ACCS networking model to be able to distribute events to each of the running application instances, in order to test it offline, it may be necessary to set environment variables in order to allow the code to function in your development environment. These variables are as follows:

 + EVENT_BIND_INTERFACE - The name of the local network interface on which to send and receive events. In Windows, setting this to 'Ethernet' is typical, and on Unix, 'eth0'. If this is not set, you will likely observe a number of errors.
 + EVENT_NETWORK_PORT - If you have a port-collision, you can manually set the port on which to send and receive events. For offline testing, this defaults to 52467.

This module uses the APP_HOME and HOSTNAME environment variables which are set automatically by ACCS in order to determine if it is running locally or not. If both of these are set in your environment, the module may not behave as expected locally.

## Full Documentation

### Constructor
```
Network()
```
Creates a new handler for creating and firing events.

The event network is a singleton, so the constructor simply returns a handler on the global instance.

### Network.on
```
on(eventName, eventFunction)
```
on adds a new behaviour to be taken when the specified event is fired. Multiple listeners can be listening for the same event, and all will be called with the supplied arguments. Listeners are local to the application instance, though can be invoked from any instance, local or remote.

**eventName:** a string specifying the event identifier.

**eventFunction:** function that is to be invoked when the event occurs. The function can have accept number of arguments, though as these arguments are serialised and transmitted over the network, avoid passing around functions, unless you serialise them appropriately.

**returns** a unique identifier for this event, which can be used to allow for the listener to be removed with unsubscribe()

### Network.once
```
once(eventName, eventFunction)
```
once adds a new behaviour to be taken when the specified event is fired, like on() does. The difference between the two is that an event added with once is removed after being invoked a single time, while an event added with on persists. The parameters are return value are the same as .on()

### Network.fire
```
fire(eventName, ...args)
```
fire invokes all of the event listeners on the specified event name, with arguments specified by args.

**eventName:** a string specifying the event identifier.

**args:** any number of arguments with which the functions on the event listener are invoked.

### Network.unsubscribe
```
unsubscribe(eventId)
```
unsubscribe removes a specific event listener.

**eventId:** the id of the event to be removed. This value is returned from the inital creation with .on() or .once().

## Changelog

Patch versions are used for bug and documentation-fixes.

**1.0.x:** Initial release. 
