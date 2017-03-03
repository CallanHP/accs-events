var expect = require('chai').expect;
var stdout = require("test-console").stdout;

var Network = require('../event_network.js');

var nw = new Network();


/* Console testing pattern!
var inspect = stdout.inspect();
//Do stuff that logs to console
inspect.restore();
expect(inspect.output).to.have.members(["ExpectedLogMessage\n"]);
*/

describe("Multicast Event Network", function(){
  before(function(){
    nw.on('testEventNoParams', function(){console.log("testEventNoParams was invoked!");});
    nw.on('testEvent', function(message){console.log(message);});
    nw.on('testEventTwoParts', function(messageOne, messageTwo){console.log(messageOne+messageTwo);});
  });

  it("Displays singleton Behaviour", function(){
    var newNetwork = new Network();
    expect(newNetwork._eventIds).to.deep.equal(nw._eventIds);
  });

  it("Adds a new event and returns an appropriate uuid", function(){
    var id = nw.on('testEventCreationReturnsID', function(){console.log("Event called.");});
    expect(id).to.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}/);
  });

  it("Invokes an event, passing no parameters", function(done){
    var inspect = stdout.inspect();
    nw.fire('testEventNoParams');
    //Using timeouts, because there is no other way to handle expected async
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["testEventNoParams was invoked!\n"]);
      done();
    }, 100);
  });

  it("Invokes an event, passing one simple parameter", function(done){
    var inspect = stdout.inspect();
    nw.fire('testEvent', "Passed a message!");
    //Using timeouts, because there is no other way to handle expected async
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["Passed a message!\n"]);
      done();
    }, 100);
  });

  it("Invokes an event, passing multiple simple parameters", function(done){
    var inspect = stdout.inspect();
    nw.fire('testEventTwoParts', "Hello ", "World");
    //Using timeouts, because there is no other way to handle expected async
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["Hello World\n"]);
      done();
    }, 100);
  });

  it("Clear an event", function(done){
    var eventId = nw.on('testEventToClear', function(){console.log("This event should have been cleared!");});
    nw.unsubscribe(eventId);
    var inspect = stdout.inspect();
    nw.fire('testEventToClear');
    //Using timeouts, because there is no other way to handle expected async
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.not.have.members(["This event should have been cleared!\n"]);
      done();
    }, 100);
  });

  it("Clear a non-existant event", function(){
    var eventId = nw.on('testEventToClear', function(){console.log("This event should have been cleared!");});
    nw.unsubscribe(eventId);
    try{
      expect(nw.unsubscribe(eventId)).to.throw(Error);
    }catch(err){}
  });  

});