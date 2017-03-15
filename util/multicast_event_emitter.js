'use strict';
/*
 * Networking magic to underpin the event delivery network, ensuring that events can be
 * propagated to other containers in our application cluster. This is handled using
 * the multi-cast capability of ACCS.
 * Lots of fun ACCS-specific behaviour here to be able to set up the broadcaster and
 * receiver appropriately.
 */
var dgram = require('dgram');
var os = require('os');

const INTMAX = 2147483647;

//Determine offsets for the multi-cast group from the app name
//Hashing is pretty fast, but still don't do it if we don't have to...
if(!process.env.MULTICAST_ADDRESS || !process.env.MULTICAST_PORT || Number(process.env.MULTICAST_PORT) == NaN){
  var hostHash = _hashAppName((process.env.HOSTNAME || "localTesting.local"));
}

//Can use pretty much any address in the 224.0.0.255 - 231.255.255.255 range
//http://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
//We are going to use the 228.186.2/8 range
//Between this and the port binding, that is a lot of space for ACCS apps
//In the event of a collision, handle manually using process.env.MULTICAST_ADDRESS
var _multicastAddress;
if(process.env.MULTICAST_ADDRESS){
  _multicastAddress = process.env.MULTICAST_ADDRESS;
}else{
  _multicastAddress = "228.186.2." +(hostHash % 254);
}
var _multicastPort;
if(process.env.MULTICAST_PORT && Number(process.env.MULTICAST_PORT) != NaN){
  _multicastPort = Number(process.env.MULTICAST_PORT);
}else{
  //IANA Ephemeral port range (49152 to 65535), or close enough
  _multicastPort = 49152 +(hostHash % 15383);
}

//ACCS has a couple of network interfaces, eth0 (which is in the 172.x range) and ethwe (which is in the 10.32.x range)
//The 172.x network is the docker default bridge network.
//The 10.x network is a Docker Swarm overlay network???
const ACCS_INTERNAL_INTERFACE_NAME = "ethwe";

//Set up broadcast server
var _eventServer = dgram.createSocket("udp4");
_eventServer.bind(_multicastPort, _getHostIP(), function(err){
  if(err){
    console.error(err);
  }else{
    _eventServer.setBroadcast(true);
    _eventServer.setMulticastTTL(128);
    _eventServer.addMembership(_multicastAddress, _getHostIP());
  }
});

function _MulticastEventHandler(parent){
  this._parent = parent;
  //Set up client receiver
  //this._eventClient = dgram.createSocket('udp4');
  var self = this;
  _eventServer.on('message', function (message, remote) {   
    self._handleMessage(message);
  });
  // this._eventClient.bind(_multicastPort, _getHostIP(), function(err){
  //   if(err){
  //     console.error(err);
  //   }else{
  //     var address = self._eventClient.address();
  //     //console.log('UDP Client listening on ' + address.address + ":" + address.port);
  //     self._eventClient.setBroadcast(true);
  //     self._eventClient.setMulticastTTL(128); 
  //     self._eventClient.addMembership(_multicastAddress, _getHostIP());
  //   }
  // });
}

_MulticastEventHandler.prototype._broadcastEvent = function(eventName, ...args){
  var event = { eventName: eventName,
                args: JSON.stringify(args)
              };
  var message = Buffer.from(JSON.stringify(event), 'utf8');
  _eventServer.send(message, 0, message.length, _multicastPort, _multicastAddress);
}

_MulticastEventHandler.prototype._handleMessage = function(message){
  var event = JSON.parse(message);
  var eventArgs = JSON.parse(event.args);
  if(eventArgs == null){
    eventArgs = new Array();
  }
  this._parent._callEvent(event.eventName, eventArgs);
}

//Get the host IP address based upon the network interfaces
function _getHostIP(){
  var interfaces = os.networkInterfaces();
  var interfaceName = (process.env.MULTICAST_BIND_INTERFACE || ACCS_INTERNAL_INTERFACE_NAME);
  var accsInterface = interfaces[interfaceName];
  if(!accsInterface){
    console.warn("The ACCS network interface doesn't appear to be present, will select a different available interface for binding.");
    console.warn("This may cause issues with event distribution.");
    return null;
  }
  //Might have to handle aliases???
  for(var address in accsInterface){
    if(accsInterface[address].family == "IPv4" && !accsInterface[address].internal){
      return accsInterface[address].address;
    }
  }
  console.warn("No IPv4 addresses found for the specified network. Likely the MULTICAST_BIND_INTERFACE variable is incorrect.");
  console.warn("Will attempt to select a different interface for binding. This might cause issues with event distribution");
  return null;
}

//As applications should have to do as little configuration as possible, we need a mechanism
//by which all instances of the same application join the same multi-cast group. In order to
//do this, we use a common identitifer in order to determine the group, by hashing the application
//name in a relatively uniform distribution in range [0, INTMAX (2^31)]to hopefully avoid clashes.
function _hashAppName(appName){
  //Our somewhat random large prime.
  var Q = 147606721;
  var result = 0;
  for(var i = 0; i<appName.length; i++){
    result = (result * Q + (appName.charCodeAt(i)*appName.charCodeAt(i))) % INTMAX;
  }
  result *= Q;
  return result % INTMAX;
}

module.exports = _MulticastEventHandler;