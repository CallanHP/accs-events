/* 
 * Credit where credit is due:
 * This is a high performance UUID generator based upon Jeff Ward's technique
 * outlined here:
 * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
 * 
 * Additional collision avoidance is adopted by incorporating part of 
 * Briguy37's answer (date offsetting) in the same thread.
 */

var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

module.exports.generateUUID = function()
{
  var d = new Date().getTime();
  var d0 = Math.random()*0xffffffff|0;
  var d1 = Math.random()*0xffffffff|0;
  var d2 = Math.random()*0xffffffff|0;
  var d3 = Math.random()*0xffffffff|0;
  return lut[(d+d0)&0xff]+lut[(d+d0)>>8&0xff]+lut[(d+d0)>>16&0xff]+lut[(d+d0)>>24&0xff]+'-'+
    lut[(d+d1)&0xff]+lut[(d+d1)>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
    lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
    lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
}
