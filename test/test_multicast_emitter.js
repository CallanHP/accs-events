var MulticastEvents = require('../multicast_event_emitter.js');

var eventHandler = new MulticastEvents();

var mockEventTypes = new Array("eventOne", "eventTwo", "alarmOne", "alerting");
var iter = 0;

setInterval(function(){
	console.log("Broadcasting - " +mockEventTypes[iter%4]);
	eventHandler._broadcastEvent(mockEventTypes[iter%4]);
	iter++;
}, 1000)