var express = require('express');
//os is used to access the networking interfaces, to allow us to demonstrate the networking behaviour
var os = require('os');
var EventNetwork = require('accs-events');

var app = express();
app.set('port', (process.env.PORT || 3001));

const ACCS_INTERNAL_INTERFACE_NAME = "ethwe";
var thisHost = _getHostIP();

var waiting = {};

var eventNetwork = new EventNetwork();

/*
 * This functions as a long-polling endpoint, creating an event which can be resolved
 * from the /resolve endpoint, which triggers returning to the client.
 *
 * Requires an invocation with an 'id' query parameter, which is used as the event name.
 */
app.get('/poll', function(req, res) {
  var identifier = req.query.id;
  if(identifier == null){
    result.status(400).send("id query parameter is required!");
  }
  console.log("Starting polling on identifer " +identifier +"...");
  //Create an event listener, which we will use to resolve this long poll.
  eventNetwork.once(identifier, function(remoteIP, message){
    res.status(200).send(thisHost +" received message: '" +message +"' from " +remoteIP);
  });
});

/*
 * This endpoint just fires an event to resolve any clients polling on a given identifier
 * with an optional message to demonstrate how data can be passed between instances.
 */
app.get('/resolve', function(req, res) {
  var identifier = req.query.id;
  if(identifier == null){
    res.status(400).send("id query parameter is required!");
    return;
  }
  var msg = req.query.msg;
  if(!msg){
    msg = "Resolved with no message.";
  }
  eventNetwork.fire(identifier, thisHost, msg);
  res.status(200).send(thisHost +" resolved " +identifier +"!");
});

app.listen(app.get('port'), function() {
  console.log('Caching test App listening on ' + app.get('port'));
});


/*
 * Helper function to be able to show the IP address of the ACCS containers, which
 * helps to make the network distribution clearer.
 */
function _getHostIP(){
  var interfaces = os.networkInterfaces();
  var interfaceName = (process.env.MULTICAST_BIND_INTERFACE || ACCS_INTERNAL_INTERFACE_NAME);
  var accsInterface = interfaces[interfaceName];
  if(!accsInterface){
    return "";
  }
  for(var address in accsInterface){
    if(accsInterface[address].family == "IPv4" && !accsInterface[address].internal){
      return accsInterface[address].address;
    }
  }
  return "";
}