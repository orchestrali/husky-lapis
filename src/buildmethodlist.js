const fs = require('fs');
var s = require('stream');
const findmethods = require('./findmethods.js');
var methods = [];

module.exports = function buildmethodlist() {
  getmethods(4);
  
  function getmethods(stage) {
    let q = {query: {stage: stage}, fields: "title stage pnFull huntBells"};
    
    findmethods(q, (res) => {
      if (res && res.length > 0 && Array.isArray(res)) {
        console.log(res.length + " methods of stage "+stage);
        methods = methods.concat(res);
      }
      stage++;
      if (stage <= 12) {
        getmethods(stage);
      } else {
        let stream = new s.Readable();
        let str = JSON.stringify(methods.map(o => {return {title: o.title, pn: o.pnFull, stage: o.stage, huntbells: o.huntBells}}), null, 2).replace(/\n      +/g, "").replace(/\n    \]/g, "]");
        stream.push(str);
        stream.push(null);
        stream.pipe(fs.createWriteStream('public/methods.json'));
        console.log("done");
      }
    });
  }
}