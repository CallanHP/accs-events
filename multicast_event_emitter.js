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

//Can use pretty much any address in the 224.0.0.255 - 231.255.255.255 range
//http://www.iana.org/assignments/multicast-addresses/multicast-addresses.xhtml
var _multicastAddress = (process.env.MULTICAST_ADDRESS || "228.186.2.8");
var _multicastPort = (Number(process.env.MULTICAST_PORT) || 49564);
//TODO: Hash of something % 254 to determine the multi-cast binding address to prevent application collision
//TODO: Hash to something to determine ephemeral port to bind to

//"Ethernet" just for local testing
const ACCS_INTERNAL_INTERFACE_NAME = "Ethernet";

//Set up broadcast server
var _eventServer = dgram.createSocket("udp4");
_eventServer.bind(_multicastPort, function(err){
  if(err){
    console.error(err);
  }else{
    _eventServer.setBroadcast(true);
    _eventServer.setMulticastTTL(128);
    _eventServer.addMembership(_multicastAddress); 
  }
});


//Probably this is set up taking a reference to a parent as an argument?
function _MulticastEventHandler(){
  //Set up client receiver
  this._eventClient = dgram.createSocket('udp4');
  var self = this;
  this._eventClient.on('message', function (message, remote) {   
    self._handleMessage(message);
  });
  this._eventClient.bind(_multicastPort, _getHostIP(), function(err){
    if(err){
      console.error(err);
    }else{
      var address = self._eventClient.address();
      console.log('UDP Client listening on ' + address.address + ":" + address.port);
      self._eventClient.setBroadcast(true);
      self._eventClient.setMulticastTTL(128); 
      self._eventClient.addMembership(_multicastAddress, _getHostIP());
    }
  })
}

_MulticastEventHandler.prototype._broadcastEvent = function(eventName, ...args){
  //Eventually I will need to work out hot to handle the args. 
  //For now, ignore them and broadcast the eventname
  var message = Buffer.from(eventName, 'utf8');
  _eventServer.send(message, 0, message.length, _multicastPort, _multicastAddress);
}

_MulticastEventHandler.prototype._handleMessage = function(message){
  console.log("Recieved Message! - " +message);
}

//Get the host IP address based upon the network interfaces
function _getHostIP(){
  var interfaces = os.networkInterfaces();
  var interfaceName = (process.env.MULTICAST_BIND_INTERFACE || ACCS_INTERNAL_INTERFACE_NAME)
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

module.exports = _MulticastEventHandler;