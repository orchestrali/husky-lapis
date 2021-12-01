var stages = ["minimus", "doubles", "minor", "triples", "major", "caters", "royal", "cinques", "maximus", "sextuples", "fourteen", "septuples", "sixteen"];
var ordinals = ["first", "third", "fifth", "seventh", "ninth", "eleventh", "thirteenth", "fifteenth"];
var conductkeys = [
  ["p",";"],["o","l","/","."],["i","k",",","m"],["u","j","n","h"],["r","f","b","g"],["e","d","c","v"],["w","s","z","x"],["q","a"]
];
//
var bells;
var bellurl = "https://cdn.glitch.com/3222d552-1e4d-4657-8891-89dc006ccce8%2F";
var numbells;
var currentrow = [];
var insidepairs = [];
var trebleloc = "right";
var speed = 2.4;
var delay;
var playing = false;
var stroke = 1; //1 for handstrokes, -1 for backstrokes
var place = 0;
var nextBellTime = 0.0;
var rownum = 0;
var rowArr = [];
var method = {
  title: "Double Court Bob Minor",
  stage: 6,
  pn: ["x",[1,4],"x",[3,6],"x",[1,6],"x",[3,6],"x",[1,4],"x",[1,6]]
};
var buttons = [];
var timeout;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const panner = audioCtx.createPanner();
panner.panningModel = 'equalpower';
const gainNode = audioCtx.createGain();
let lookahead = 25.0;
let schedule = 0.1;
let queue = [];
let lastmoved = "c5";
let lastrow = 0;
var keycodes = {
    cross: [112, 111, 105, 117, 114, 101, 119, 113], // "poiu rewq"
    stretch: [59, 108, 107, 106, 102, 100, 115, 97], // ";lkj fdsa"
    stretch1: [47, 46, 44, 109, 110, 104, 98, 103, 99, 118, 122, 120] // "/.,mnh bgcvzx"
  };
var cross, stretch, stretch1;
var auraqueue = [];
var methods;
var waitforme = false;
var waiting;
var deadline;
var currentblue;
var blue;
//
//

$('div.dialog').hide();
$("#startdialog").centre().show();

$(function() {
  $.getJSON("bells.json", function(data) {
    bells = data;
    setupSample(0, () => {
      getmethods();
    });
  }).fail(function( jqxhr, textStatus, error ) {
    var err = textStatus + ", " + error;
    console.log( "Request Failed: " + err );
  });
  
  //change button clicked
  $("#controls").on("click", "button", function() {
    let classes = $(this).attr("class");
    $(this).removeClass("wrong");
    $(this).removeClass("highlight");
    if (classes.includes("highlight")) currentblue = null;
    let pair = ordinals.indexOf($(this).parent().attr("id"))*2+1;
    change(pair,$(this).attr("class"));
    if (playing && !classes.includes("highlight") && !classes.includes("wrong")) {
      errorcorrect($(this).attr("class"),pair,currentblue);
    } 
    if (playing && classes.includes("highlight") && auraqueue.length) {
      advanceblue();
    }
    if (waiting && !$(".wrong").length) {
      waiting = false;
      nextBellTime = Math.max(audioCtx.currentTime, nextBellTime);
      scheduler();
    }
    //console.log(mypair);
    
  });
  
  $("#methodmenu li").on("click", function() {
    let text = $(this).text();
    if (text === "Random") {
      setMethod(methods[Math.floor(Math.random()*methods.length)]);
      $('div.dialog,div#dialogUnderlay').hide();
    } else {
      let m = methods.find(o => o.title === text);
      if (m) {
        setMethod(m);
        $('div.dialog,div#dialogUnderlay').hide();
      }
    }
  })
  
  $("body").on("keypress", keychange);
  
  $("#start").on("click", treblesgoing);
  $("#reset").on("click", reset);
  $('input[name="trebleloc"]').on("change", reversedirection);
  
  //change speed
  $("#speed").change(function() {
    speed = Number($("#speed").val());
    delay = speed/numbells;
  });
  
  //change volume
  $("#volume").on("change", function(e) {
    gainNode.gain.value = this.value;
  });
  
  $("#menu").on("click", function() {
    $("#dialogUnderlay").show();
    $("#startdialog").centre().show();
  });
  
  $("#waitforme").on("click", function() {
    waitforme = $(this).prop("checked");
  });
  
});

function getmethods(n) {
  $.get("methods.json", function(data) {
    methods = data;
    if (n > -1 && n < methods.length) setMethod(methods[n]);
  });
}



function setMethod(obj) {
  method = obj;
  numbells = obj.stage;
  if (obj.stage%2===1) numbells++;
  delay = speed/numbells;
  cross = keycodes.cross.slice(-numbells/2);
  stretch = keycodes.stretch.slice(-numbells/2);
  stretch1 = keycodes.stretch1.slice(4-numbells);
  $("div.bell,div.controls").remove();
  
  currentrow = [];
  insidepairs = [];
  for (let i = 0; i < numbells; i++) {
    currentrow.push(i+1);
    insidepairs.push(-1);
    addBell(bells[i], i);
  }
  bellnums();
  assignCaptain();
  buildArrs(obj);
  $("#display").css("width", (numbells)*100+"px");
  $("#display").text(method.title);
}

function buildArrs(obj) {
  let rz = [];
  let pn = obj.pn;
  let arr = [{row: []}, {row: []}];
  buttons = [[]];
  for (let i = 0; i < numbells; i++) {
    rz.push(i+1);
    arr.forEach(r => {
      r.row.push(i+1);
    });
  }
  let row = rz;
  let l = 0;
  do {
    for (let i = 0; i < pn.length; i++) {
      let next = [];
      let bb = [];
      let dir = 1;
      for (let p = 0; p < numbells; p++) {
        if ((pn[i] === "x" || !pn[i].includes(p+1)) && p < obj.stage) {
          next.push(row[p+dir]);
          dir *= -1;
        } else {
          next.push(row[p]);
        }
        if (p%2===0) {
          if (pn[i] === "x") {
            bb.push("cross");
          } else if (pn[i].includes(p+1) && !pn[i].includes(p+2) && p+1 < obj.stage) {
            bb.push("stretchL");
          } else if ((pn[i].includes(p+2) || p+2 > obj.stage) && !pn[i].includes(p+1)) {
            bb.push("stretchR");
          } else if ((pn[i].includes(p+1) && (pn[i].includes(p+2) || p+1 === obj.stage)) || p >= obj.stage) {
            bb.push("places");
          } else if (dir === -1) {
            bb.push("cross");
          } else {
            bb.push("stretch");
          }
        }
      }
      arr.push({row: next});
      buttons.push(bb);
      row = next;
      
      //console.log(next);
    }
    l++;
  } while (!arr[arr.length-1].row.every((a,i) => a === rz[i]) && l < 12);
  rowArr = arr;
  
}

function errorcorrect(type,pair,blue) {
  if (type !== "places") {
    let target = "#"+ordinals[(pair-1)/2]+" ."+type;
    
    
    if (blue && blue.includes("stretch") && type === "stretch" && blue.includes(ordinals[(pair-1)/2])) {
      
      if (blue.includes("stretchL")) {
        $(target+"R").addClass("wrong");
      } else if (blue.includes("stretchR")) {
        $(target+"L").addClass("wrong");
      }
      $(blue).removeClass("highlight");

      currentblue = null;
      advanceblue();
      
      
    } else {
      $(target).addClass("wrong");
    }
    
    
  }
}

function advanceblue() {
  if (auraqueue.length) {
    blue = auraqueue.shift();
    currentblue = blue.target;
    $(currentblue).addClass("highlight");

  } else {
    blue = null;
  }
}

function keychange(e) {
  let type, pair;
  if (cross.includes(e.which)) {

    type = "cross";
    pair = cross.indexOf(e.which)*2 + 1;
  } else if (stretch.includes(e.which)) {
    switch (stretch.indexOf(e.which)) {
      case 0:
        type = "stretchL";
        break;
      case stretch.length-1:
        type = "stretchR";
        break;
      default:
        type = "stretch";
    }
    pair = stretch.indexOf(e.which)*2 + 1;
  } else if (stretch1.includes(e.which)) {
    let i = stretch1.indexOf(e.which);
    type = i%2 === 0 ? "stretchL" : "stretchR";
    pair = i%2 === 0 ? i+3 : i+2;
  }
  let correction;
  if (type) {
    let target = "#"+ordinals[(pair-1)/2]+" ."+type;
    correction = $(target).hasClass("wrong");
    if (playing && !$(target).hasClass("highlight") && !$(target).hasClass("wrong")) {
      errorcorrect(type,pair,currentblue);
    } else {
      $(target).removeClass("wrong");
    }
    if (playing && $(target).hasClass("highlight")) {
      $(target).removeClass("highlight");
      currentblue = null;
      
      advanceblue()
      
    }
    
    
    change(pair,type);
  } else if ($(".places.highlight").length) {
    $(".places").removeClass("highlight");
    pair = ordinals.findIndex(w => currentblue.includes(w))*2+1;
    currentblue = null;
    if (playing) {
      advanceblue();
    }
    
  }
  if (waiting && !$(".wrong").length) {
    
    nextBellTime = Math.max(audioCtx.currentTime, nextBellTime);
    
    waiting = false;
    scheduler();
  }
}

function change(pair,type) {
  if (type === "cross") {
    let dir = 1;
    let first = currentrow[pair-1]
    for (let i = pair-1; i <= pair; i++) {
      let bell = bells.find(b => b.num === currentrow[i]);
      let p = i+dir;
      let left = (trebleloc === "right" ? numbells-1-p : p)*100;
      $("#"+bell.bell).css("left", left+"px");
      dir*=-1;
      insidepairs[i] = -1;
    }
    currentrow[pair-1] = currentrow[pair];
    currentrow[pair] = first;
  } else if (type !== "places") {
    let arr = [];
    switch (type) {
      case "stretch":
        arr.push(pair-1,pair);
        break;
      case "stretchL":
        arr.push(pair);
        break;
      case "stretchR":
        arr.push(pair-1);
    }
    arr.forEach(i => {
      let bell = bells.find(b => b.num === currentrow[i]);
      let otheri = i === pair ? pair+1 : pair-2;
      if (insidepairs[otheri] === 1) {
        //complete the swap!
        let other = bells.find(b => b.num === currentrow[otheri]);
        let left = (trebleloc === "right" ? numbells-1-otheri : otheri)*100;
        let otherleft = (trebleloc === "right" ? numbells-1-i : i)*100;
        $("#"+bell.bell).css("left", left+"px");
        $("#"+other.bell).css("left", otherleft+"px");
        currentrow[i] = other.num, currentrow[otheri] = bell.num;
        insidepairs[otheri] = -1;
      } else {
        let left = (trebleloc === "right" ? numbells-1-i : i)*100;
        if (insidepairs[i] === -1) left += (i%2 === 0 && trebleloc === "right") || (i%2 === 1 && trebleloc === "left") ? 50 : -50;
        $("#"+bell.bell).css("left", left+"px");
        insidepairs[i] *= -1;
      }
    });
  }
}

function reversedirection() {
  trebleloc = $('input[name="trebleloc"]:checked').val();
  $("div.bell").remove();
  for (let i = 0; i < numbells; i++) {
    addBell(bells[i], i);
  }
  bellnums();
  cross.reverse();
  stretch.reverse();
  stretch1.reverse();
  for (let i = 1; i <= numbells/2; i++) {
    let child = trebleloc === "right" ? "nth-child("+(i+1)+")" : "nth-last-child("+i+")";
    $(".controls:"+child).attr("id", ordinals[i-1]);
    if (i > 1 && i < numbells/2) {
      ["stretchL","stretchR"].forEach((id,j) => {
        let text = $(".controls:"+child+" ."+id).text();
        let ntext = (2*i-j === 3 ? "3rd" : (2*i-j)+"th") + text.slice(3);
        $(".controls:"+child+" ."+id).text(ntext);
      });
    }
  }
  //these are just the buttons on the ends...(the ones that say "stretch" but only stretch one direction)
  $(".stretchL:nth-child(2)").addClass("stretchRR").removeClass("stretchL");
  $(".stretchR:nth-child(2)").addClass("stretchL").removeClass("stretchR");
  $(".stretchRR").addClass("stretchR").removeClass("stretchRR");
}

function reset() {
  $("button").removeClass("highlight");
  currentrow = [];
  insidepairs = [];
  currentblue = null;
  auraqueue = [];
  waiting = false;
  rownum = 0;
  stroke = 1;
  place = 0;
  lastrow = 0;
  for (let i = 0; i < numbells; i++) {
    currentrow.push(i+1);
    insidepairs.push(-1);
    let left = 100 * (trebleloc === "right" ? i : numbells-1-i);
    $("#"+bells[i].bell).attr("style","left:"+left+"px");
  }
}

function treblesgoing() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  playing = !playing;
  if (playing) {
    $("#start").text("Stop");
    deadline = audioCtx.currentTime + speed*2;
    nextBellTime = audioCtx.currentTime;
    scheduler();
    requestAnimationFrame(movebell);
  } else {
    clearTimeout(timeout);
    $("#start").text("Start");
  }
  
  
}

function nextPlace() {
  nextBellTime += delay;

  place++;
  if (place === numbells) {
    if (stroke === -1) nextBellTime += delay; //add handstroke gap
    place = 0;
    stroke *= -1;
    $("div.bell").css("top", 150 + stroke * 25 + "px");
    rownum++;
  }

}

function scheduleRing(p, t) {
  if (blue && waitforme && (blue.row < rownum || (blue.row === rownum && blue.place <= p))) {
    //console.log(blue);
    waiting = audioCtx.currentTime;
  } else {
    let bell = bells.find(b => b.num === currentrow[p]);
    queue.push({bell: bell.bell, stroke: stroke, time: t, place: p, row: rownum});

    if (bell) {
      let pan = -p/(numbells-1) + 0.5;
      playSample(audioCtx, bell.buffer, pan, t);
    }
    nextPlace();
  }
  

}

function movebell() {
  let bellmove = lastmoved;
  let currentTime = audioCtx.currentTime;
  let currentstroke;
  let bellplace;
  let bellrow = lastrow;

  while (queue.length && queue[0].time < currentTime) {
    bellmove = queue[0].bell;
    currentstroke = queue[0].stroke;
    bellplace = queue[0].place;
    bellrow = queue[0].row;
    queue.splice(0, 1);
    
    if (bellplace%2===1 && buttons[bellrow] && buttons[bellrow].length) {
      let i = (bellplace-1)/2;
      let type = buttons[bellrow][i];
      let target = "#"+ordinals[i]+" ."+type;
      let st = (type === "stretchR" && trebleloc === "right") || (type === "stretchL" && trebleloc === "left");
      let str = (type === "stretchL" && trebleloc === "right") || (type === "stretchR" && trebleloc === "left");
      let obj = {
        target: target,
        row: bellrow+1,
        place: bellplace + (["places","cross"].includes(type) ? -1 : str ? 0 : -2)
      }
      if ($(".highlight").length) {
        auraqueue.push(obj);
      } else {
        blue = obj;
        currentblue = target;
        //console.log(currentblue);
        $(target).addClass("highlight");
        
        //deadline = currentTime + speed - delay*(bellrow%2 === 0 ? 2 : 1);
        //console.log("setting deadline");
      }
    }
    if (bellrow > buttons.length) {
      blue = null;
    }
  }
  if (playing && waitforme && ($(".wrong").length)) {
    waiting = currentTime;
  }
  

  if (lastmoved != bellmove) {
    $("#"+bellmove).css("top", 150 - currentstroke*25 + "px");
    lastmoved = bellmove;

  }

  requestAnimationFrame(movebell);

}

function scheduler() {
  while (nextBellTime < audioCtx.currentTime + schedule && !waiting) {
    scheduleRing(place, nextBellTime);
  }
  !waiting ? timeout = setTimeout(scheduler, lookahead) : clearTimeout(timeout);

}

async function getFile(audioContext, filepath) {
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
}

async function setupSample(i, cb) {
  let arrayBuffer = await getFile(audioCtx, bellurl + bells[i].url);
  audioCtx.decodeAudioData(arrayBuffer, (buffer) => {
    bells[i].buffer = buffer;
    if (i < bells.length-1) {
      i++;
      setupSample(i,cb);
    } else {
      console.log("finished setting up");
      cb();
    }
  }, (e) => { console.log(e) });
}

function playSample(audioContext, audioBuffer, pan, t) {
  //console.log("playSample called");
  //console.log(audioBuffer);
  panner.setPosition(pan, 0, 1 - Math.abs(pan));
  const sampleSource = audioContext.createBufferSource();
  sampleSource.buffer = audioBuffer;
  sampleSource.connect(panner).connect(gainNode).connect(audioContext.destination)
  //sampleSource.connect(audioContext.destination);
  sampleSource.start(t);
  return sampleSource;
}


function addControls(id, n, keys) {
    
  let left = 100 * (trebleloc === "right" ? numbells-1-n : n-1) + 48;
  let div = `
      <div class="controls" id="${id}" style="left:${left}px;">
        `;
  let arr = ["cross", "stretch"];
  if (n != 1 && n != numbells-1) {
    arr.push(n+id.slice(-2)+"s", (n+1)+"ths");
  }
  arr.push("places");
  for (let i = 0; i < arr.length; i++) {
    let cl;
    switch (arr[i]) {
      case "cross": case "places":
        cl = arr[i];
        break;
      case "stretch":
        cl = n === 1 ? "stretchL" : n === numbells-1 ? "stretchR" : "stretch";
        break;
      default:
        cl = i === 2 ? "stretchL" : "stretchR";

    }
    div += `<button class="${cl}" type="button">${arr[i]}${keys && keys[i] ? `
    `+keys[i] : ""}</button>
        `;
  }
  div += `</div>`;
  $("div#controls").append(div);
}

function assignCaptain() {
  let keys = conductkeys.slice(-numbells/2);
  keys[0] = keys[0].slice(0,2);
  for (let i = 1; i < numbells; i+=2) {
    addControls(ordinals[(i-1)/2],i,keys[(i-1)/2]);
  }
}

function bellnums() {
    let num = numbells;
    $("div.bell p").remove();
    for (let i = 0; i < bells.length; i++) {
      if (num > 0) {
        $("#"+bells[i].bell + " div.handle").append("<p>"+num+"</p>");
        bells[i].num = num;
      } else {
        delete bells[i].num;
      }
      num--;
      
    }
  }

var svgurl = "http://www.w3.org/2000/svg";
var pathinfo = {d: `M10,5
             H90
             q -20 20, -20 60
             q -20 10, -40 0
             q 0 -40, -20 -60
             `,
               "stroke-width": "2",
               stroke: "black"};
function addBell(bell, i) {
  let svg = document.createElementNS(svgurl, "svg");
  let info = {width: "100", height: "100", viewBox: bell.viewbox};
  for (let key in info) {
    svg.setAttributeNS(null, key, info[key]);
  }
  let path = document.createElementNS(svgurl, "path");
  for (let key in pathinfo) {
    path.setAttributeNS(null, key, pathinfo[key]);
  }
  svg.appendChild(path);

  let left = 100 * (trebleloc === "right" ? i : numbells-1-i);
  let div = document.createElement("div");
  div.id = bell.bell;
  div.setAttribute("class", "bell");
  div.setAttribute("style", "left:"+left+"px");
  div.appendChild(svg);
  let base = document.createElement("div");
  base.setAttribute("class", "base");
  let handle = document.createElement("div");
  handle.setAttribute("class", "handle");
  div.appendChild(base);
  div.appendChild(handle);
  let room = document.getElementById("bells");
  if (trebleloc === "right") {
    room.appendChild(div);
  } else {
    room.prepend(div);
  }

}