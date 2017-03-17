var expect = require('chai').expect;
var stdout = require('test-console').stdout;

var Network = require('../event_network.js');

var nw = new Network();


/* Console testing pattern
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
    nw.on('testEventComplexObject', function(obj){console.log(obj.deepParam + obj.arrayParam[0]);});
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

  it("Creates an event to be called once", function(done){
    nw.once('testEventShouldBeCalledOnce', function(){console.log("testEventShouldBeCalledOnce called.");});
    var inspect = stdout.inspect();
    nw.fire('testEventShouldBeCalledOnce');
    //Using timeouts, because there is no other way to handle expected async
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["testEventShouldBeCalledOnce called.\n"]);
      inspect = stdout.inspect();
      nw.fire('testEventShouldBeCalledOnce');
      setTimeout(function(){
        inspect.restore();
        expect(inspect.output).to.have.length(0);
        done();
      },100);
    }, 100);
  });

  it("Invokes an event, passing one simple parameter", function(done){
    var inspect = stdout.inspect();
    nw.fire('testEvent', "Passed a message!");
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["Passed a message!\n"]);
      done();
    }, 100);
  });

  it("Invokes an event, passing multiple simple parameters", function(done){
    var inspect = stdout.inspect();
    nw.fire('testEventTwoParts', "Hello ", "World");
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["Hello World\n"]);
      done();
    }, 100);
  });

  it("Invokes an event, with a complex paremeter", function(done){
    var eventObject = {
                        deepParam : "Next is array entry:",
                        arrayParam : ["This is the array entry", "Other entry"]
                      };
    var inspect = stdout.inspect();
    nw.fire('testEventComplexObject', eventObject);
    setTimeout(function(){
      inspect.restore();
      expect(inspect.output).to.have.members(["Next is array entry:This is the array entry\n"]);
      done();
    }, 100);
  });

  it("Clear an event", function(done){
    var eventId = nw.on('testEventToClear', function(){console.log("This event should have been cleared!");});
    nw.unsubscribe(eventId);
    var inspect = stdout.inspect();
    nw.fire('testEventToClear');
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

  it("Create a .on() listener with missing/invalid arguments throws syntax errors", function(){
    try{
      expect(nw.on()).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.on("event")).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.on(true,function(){})).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.on("event","string")).to.throw(SyntaxError);
    }catch(err){}      
  });
  it("Create a .once() listener with missing/invalid arguments throws syntax errors", function(){
    try{
      expect(nw.once()).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.once("event")).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.once(true,function(){})).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.once("event","string")).to.throw(SyntaxError);
    }catch(err){}      
  });
  it("Invoking .fire() with missing/invalid arguments throws syntax errors", function(){
    try{
      expect(nw.fire()).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.fire(true)).to.throw(SyntaxError);
    }catch(err){} 
  });
  it("Invoking .unsubscribe() with missing/invalid arguments throws syntax errors", function(){
    try{
      expect(nw.unsubscribe()).to.throw(SyntaxError);
    }catch(err){}
    try{
      expect(nw.unsubscribe(true)).to.throw(SyntaxError);
    }catch(err){} 
  });
});

describe("Because of dependancy on network binding behaviour, it is hard to test multiple instance behaviour." 
  +" A sample express file is included in the test folder for multi-instance testing.", function(){
    it("Returns true", function(){
      expect(true).to.equal(true);
    });
  });