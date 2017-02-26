'use strict';
//UDP Datagrams used for multi-casting
var dgram = require('dgram');


//Singleton Network pattern is acheived by Node Module caching.
//This isn't 100% reliable, but should be good for most cases.
var _globalEventNetwork = {};
var _eventServer = dgram.createSocket("udp4");
//Can use pretty much any address in the 224.0.0.255 - 231.255.255.255 range
//http://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
var _multicastAddress = (process.env.MULTICAST_ADDRESS || "228.186.2.8")

//Set up datagram behaviour for multi-casting
_eventServer.bind();
_eventServer.setBroadcast(true);
_eventServer.setMulticastTTL(128);
_eventServer.addMembership(_multicastAddress);

function _broadcastEvent(event) {
	//How to serialize events?
    var message = new Buffer(event);
    _eventServer.send(message, 0, message.length, 8088, _multicastAddress);
    console.log("Sent " + message + " to the wire...");
}

//Also need a client
var _eventClient = dgram.createSocket('udp4');

_eventClient.on('listening', function () {
    var address = _eventClient.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    _eventClient.setBroadcast(true)
    _eventClient.setMulticastTTL(128); 
    _eventClient.addMembership(_multicastAddress, HOST);
});

_eventClient.on('message', function (message, remote) {   
    console.log('A: Epic Command Received. Preparing Relay.');
    console.log('B: From: ' + remote.address + ':' + remote.port +' - ' + message);
});

//BIND DETAILS?
//_eventClient.bind(PORT, HOST);


function Network(){
	this._events = {};
}

Network.prototype.on = function(eventName, eventFunction){
	if(this._events[eventName]){
		this._events[eventName].push(eventFunction);
	}else{
		this._events[eventName] = new Array(eventFunction);
	}
}

Network.prototype.fire = function(eventName, ...args){
	var self = this;
	if(this._events[eventName]){
		for(eventFunction in this._events[eventName]){
			setTimeout(function(){
			    self._events[eventName][eventFunction](...args);
			},0);
		}
	}
}

module.exports = Network;