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

const ACCS_INTERNAL_INTERFACE_NAME = "???"

function _MulticastEventHandler(){

}

//Set up broadcast server
var _eventServer = dgram.createSocket("udp4");

//Set up client receiver
var _eventClient = dgram.createSocket('udp4');


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
    if(address.family == "IPv4" && !address.internal){
      return address.address;
    }
  }
  console.warn("No IPv4 addresses found for the specified network. Likely the MULTICAST_BIND_INTERFACE variable is incorrect.");
  console.warn("Will attempt to select a different interface for binding. This might cause issues with event distribution");
  return null;
}