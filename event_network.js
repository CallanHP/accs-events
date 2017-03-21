'use strict';
var EventDistributionNetwork = require('./util/network_event_emitter');
var uuid = require('./util/uuid');

//Singleton Network pattern is acheived by Node Module caching.
//This isn't 100% reliable, but should be good for most cases.
var _globalInstance = new Network();

const NO_SUCH_EVENT = "No event with that id found.";

function Network(){
  if(_globalInstance){
    return _globalInstance;
  }
  this._eventDistributor = new EventDistributionNetwork(this);
  //Object for holding events for this application instance
  this._events = {};
  //Object for holding event ids, to describe how to clear event listeners.
  this._eventIds = {};
}

Network.prototype.on = function(eventName, ttl, eventFunction){
  if(!eventName || typeof eventName != 'string'){
    throw new SyntaxError("eventName must be a string!");
  }
  if(typeof(ttl) == 'function'){
    eventFunction = ttl;
    ttl = null;
  }
  if(ttl && typeof(ttl) != 'number'){
    throw new SyntaxError("Time to live for an event must be a number!");
  }
  if(!eventFunction || typeof eventFunction != 'function'){
    throw new SyntaxError("Events must be created with a function!");
  }
  var id = uuid.generateUUID();
  if(!this._events[eventName]){
    this._events[eventName] = {};
  }
  this._events[eventName][id] = {}
  this._events[eventName][id].method = eventFunction;
  this._events[eventName][id].persistent = true;
  this._eventIds[id] = eventName;
  if(ttl && ttl > 0){
    var self = this;
    setTimeout(function(){
      try{
        self.unsubscribe(id);
      }catch(err){
        //The event is likely already unsubscribed, so we can ignore
      }
    }, ttl);
  }
  return id;  
}

//Called once, then self-deleting.
Network.prototype.once = function(eventName, ttl, eventFunction){
  if(!eventName || typeof eventName != 'string'){
    throw new SyntaxError("eventName must be a string!");
  }
  if(typeof(ttl) == 'function'){
    eventFunction = ttl;
    ttl = null;
  }
  if(ttl && typeof(ttl) != 'number'){
    throw new SyntaxError("Time to live for an event must be a number!");
  }
  if(!eventFunction || typeof eventFunction != 'function'){
    throw new SyntaxError("Events must be created with a function!");
  }
  var id = uuid.generateUUID();
  if(!this._events[eventName]){
    this._events[eventName] = {};
  }
  this._events[eventName][id] = {}
  this._events[eventName][id].method = eventFunction;
  this._events[eventName][id].persistent = false;
  this._eventIds[id] = eventName;
  if(ttl && ttl > 0){
    var self = this;
    setTimeout(function(){
      try{
        self.unsubscribe(id);
      }catch(err){
        //The event is likely already unsubscribed, so we can ignore
      }
    }, ttl);
  }
  return id;  
}

Network.prototype.fire = function(eventName, ...args){
  if(!eventName || typeof eventName != 'string'){
    throw new SyntaxError("eventName must be a string!");
  }
  //Pass it down to the EDN
  this._eventDistributor._broadcastEvent(eventName, ...args);
}

Network.prototype.unsubscribe = function(eventId){
  if(!eventId || typeof eventId != 'string'){
    throw new SyntaxError("eventId must be a string!");
  }
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
        var method = self._events[eventName][eventFunction].method;
        if(!self._events[eventName][eventFunction].persistent){
            self.unsubscribe(eventFunction);
          }
          method(...eventArgsArray);
      },0);
    }
  }
}

module.exports = Network;