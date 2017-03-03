'use strict';
var MulticastNetwork = require('./util/multicast_event_emitter');
var uuid = require('./util/uuid');

//Singleton Network pattern is acheived by Node Module caching.
//This isn't 100% reliable, but should be good for most cases.
var _globalInstance = new Network();

const NO_SUCH_EVENT = "No event with that id found.";

function Network(){
	if(_globalInstance){
		return _globalInstance;
	}
	this._MulticastEvents = new MulticastNetwork(this);
	//Object for holding events for this application instance
	this._events = {};
	//Object for holding event ids, to describe how to clear event listeners.
	this._eventIds = {};
}

Network.prototype.on = function(eventName, eventFunction){
	var id = uuid.generateUUID();
	if(!this._events[eventName]){
		this._events[eventName] = {};
	}
	this._events[eventName][id] = eventFunction;
	this._eventIds[id] = eventName;
	return id;	
}

Network.prototype.fire = function(eventName, ...args){
	//Pass it down to the EDN
	this._MulticastEvents._broadcastEvent(eventName, ...args);
}

Network.prototype.unsubscribe = function(eventId){
	if(!this._eventIds[eventId]){
		throw new Error(NO_SUCH_EVENT);
	}
	delete this._events[this._eventIds[eventId]][eventId];
	delete this._eventIds[eventId];
}

//Private method for invoking an event, called by the EDN
Network.prototype._callEvent = function(eventName, eventArgsArray){
	var self = this;
	if(this._events[eventName]){
		for(var eventFunction in this._events[eventName]){
			//This is done to handle fire and forget
			setTimeout(function(){
		    	self._events[eventName][eventFunction](...eventArgsArray);
			},0);
		}
	}
}

module.exports = Network;