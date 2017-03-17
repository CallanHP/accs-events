'use strict';
/*
 * Networking magic to underpin the event delivery network, ensuring that events can be
 * propagated to other containers in our application cluster. This is handled using
 * the multi-cast capability of ACCS.
 * Lots of fun ACCS-specific behaviour here to be able to set up the broadcasting and
 * receiving of events appropriately.
 * This takes advantage of the fact that there are shared hostnames maintained in the DNS, which allows
 * us to get a view of the rest of the instances at the time of application start.
 * Heartbeats are then used in order to maintain a view of the active instances.
 */

var dgram = require('dgram');
var os = require('os');
var dns = require('dns');

const CLUSTER_CHECK_INTERVAL = 20000;
const INTMAX = 2147483647;
const EVENT_BYTE = 0xD1;
const REGISTER_BYTE = 0xD2;
const DEREGISTER_BYTE = 0xD4;

//Determine port number from the app name, in order to mensure we are not joining event
//networks for other applications, if they start up on an IP address we have in the list.
//Hashing is pretty fast, but still don't do it if we don't have to...
if(!process.env.EVENT_NETWORK_PORT || Number(process.env.EVENT_NETWORK_PORT) == NaN){
  var hostHash = _hashAppName((process.env.HOSTNAME || "localTesting.local"));
}

var _networkPort;
if(process.env.EVENT_NETWORK_PORT && Number(process.env.EVENT_NETWORK_PORT) != NaN){
  _networkPort = Number(process.env.EVENT_NETWORK_PORT);
}else{
  //IANA Ephemeral port range (49152 to 65535), or close enough
  _networkPort = 49152 +(hostHash % 15383);
}

//ACCS has a couple of network interfaces, eth0 (which is in the 172.x range) and ethwe (which is in the 10.32.x range)
//The 172.x network is the docker default bridge network.
//The 10.x network is a Docker Swarm overlay network.
const ACCS_INTERNAL_INTERFACE_NAME = "ethwe";
const _thisIP = _getHostIP();

//Our view of the cluster.
var clusterInstances = [];

//Set up broadcast server
var _eventServer = dgram.createSocket("udp4");
_eventServer.bind(_networkPort, _thisIP, function(err){
  if(err){
    console.error(err);
  }
  if(process.env.HOSTNAME){
    dns.resolve4(process.env.HOSTNAME, function(err, addresses){
      if(err){
        console.error(err);
        return;
      }
      clusterInstances = addresses;
    });
    //Send registration messages to establish the interfaces
    _broadcastRegistration();
  }else{
    //Handle local testing
    clusterInstances = new Array(_thisIP);
  }
  
});

if(process.env.HOSTNAME){
  //Periodically check our cluster (we are handling registration events, but not deregistration, so this will likely only remove entries)
  setInterval(function(){
    dns.resolve4(process.env.HOSTNAME, function(err, addresses){
      if(err){
        console.error(err);
        return;
      }
      //Handle local testing
      if(addresses.length == 0){
        addresses = new Array(_thisIP);
      }
      clusterInstances = addresses;
    });
  }, CLUSTER_CHECK_INTERVAL);
}

function _EventDistributionNetwork(parent){
  this._parent = parent;
  var self = this;
  _eventServer.on('message', function (message, remote) {   
    self._handleMessage(message, remote);
  });
}


_EventDistributionNetwork.prototype._broadcastEvent = function(eventName, ...args){
  var event = { eventName: eventName,
                args: JSON.stringify(args)
              };
  var eventString = JSON.stringify(event);
  var message = Buffer.allocUnsafe(1 + eventString.length);
  message.writeUInt8(EVENT_BYTE, 0);
  message.write(eventString, 1, eventString.length, 'utf8');
  for(var instance in clusterInstances){
    _eventServer.send(message, 0, message.length, _networkPort, clusterInstances[instance], function(err){
      //Handle the error if we get an error NOENT? Do they appear on UDP, given it is unreliable anyway?
      if(err){
        console.error(err);
      }
    });  
  }
}

_EventDistributionNetwork.prototype._handleMessage = function(message, remote){
  var msgType = message.readUInt8(0);
  switch(msgType){
    case REGISTER_BYTE:
      console.log(remote.address +" came online, added to cluster.");
      clusterInstances.push(remote.address);
      break;
    case DEREGISTER_BYTE:
      console.log(remote.address +" went offline. Removing from cluster.");
      for(var i = 0; i<clusterInstances.length; i++){
        if(clusterInstances[i] == remote.address){
          clusterInstances.splice(i, 1);
          break;
        }
      }
      break;
    case EVENT_BYTE:
      var msg = message.toString('utf8', 1);
      var event = JSON.parse(msg);
      var eventArgs = JSON.parse(event.args);
      if(eventArgs == null){
        eventArgs = new Array();
      }
      this._parent._callEvent(event.eventName, eventArgs);
      break
    default:
      //Unknown message?!
      console.log("Message with unknown type received. Type byte: 0x" +msgType.toString(16));
  }  
}

//Get the host IP address based upon the network interfaces
function _getHostIP(){
  var interfaces = os.networkInterfaces();
  var interfaceName = (process.env.EVENT_BIND_INTERFACE || ACCS_INTERNAL_INTERFACE_NAME);
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

function _broadcastRegistration(){
  var message = Buffer.alloc(1, REGISTER_BYTE);
  for(var instance in clusterInstances){
    if(clusterInstances[instance] != _thisIP){
      _eventServer.send(message, 0, message.length, _networkPort, clusterInstances[instance], function(err){
        //Handle the error if we get an error NOENT? Do they appear on UDP, given it is unreliable anyway?
        if(err){
          console.error(err);
        }
      });  
    }    
  }
}

function _broadcastDeregistration(){
  var message = Buffer.alloc(1, DEREGISTER_BYTE);
  for(var instance in clusterInstances){
    if(clusterInstances[instance] != _thisIP){
      _eventServer.send(message, 0, message.length, _networkPort, clusterInstances[instance], function(err){
        //Handle the error if we get an error NOENT? Do they appear on UDP, given it is unreliable anyway?
        if(err){
          console.error(err);
        }
      });  
    }    
  }
}

//As applications should have to do as little configuration as possible, we need a mechanism
//by which all instances of the same application use the same port. In order to
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

module.exports = _EventDistributionNetwork;

process.on('exit', function(code){
  _broadcastDeregistration();
  //Attempt to close the socket on exit
  _eventServer.close();
});