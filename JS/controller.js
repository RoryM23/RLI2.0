const WsSubscribers = {
    __subscribers: {},
    websocket: undefined,
    webSocketConnected: false,
    registerQueue: [],
    init: function(port, debug, debugFilters) {
        port = port || 49322;
        debug = debug || false;
        if (debug) {
            if (debugFilters !== undefined) {
                console.warn("WebSocket Debug Mode enabled with filtering. Only events not in the filter list will be dumped");
            } else {
                console.warn("WebSocket Debug Mode enabled without filters applied. All events will be dumped to console");
                console.warn("To use filters, pass in an array of 'channel:event' strings to the second parameter of the init function");
            }
        }
        WsSubscribers.webSocket = new WebSocket("ws://localhost:" + port);
        WsSubscribers.webSocket.onmessage = function (event) {
            let jEvent = JSON.parse(event.data);
            if (!jEvent.hasOwnProperty('event')) {
                return;
            }
            let eventSplit = jEvent.event.split(':');
            let channel = eventSplit[0];
            let event_event = eventSplit[1];
            if (debug) {
                if (!debugFilters) {
                    console.log(channel, event_event, jEvent);
                } else if (debugFilters && debugFilters.indexOf(jEvent.event) < 0) {
                    console.log(channel, event_event, jEvent);
                }
            }
            WsSubscribers.triggerSubscribers(channel, event_event, jEvent.data);
        };
        WsSubscribers.webSocket.onopen = function () {
            WsSubscribers.triggerSubscribers("ws", "open");
            WsSubscribers.webSocketConnected = true;
            WsSubscribers.registerQueue.forEach((r) => {
                WsSubscribers.send("wsRelay", "register", r);
            });
            WsSubscribers.registerQueue = [];
        };
        WsSubscribers.webSocket.onerror = function () {
            WsSubscribers.triggerSubscribers("ws", "error");
            WsSubscribers.webSocketConnected = false;
        };
        WsSubscribers.webSocket.onclose = function () {
            WsSubscribers.triggerSubscribers("ws", "close");
            WsSubscribers.webSocketConnected = false;
        };
    },
    /**
     * Add callbacks for when certain events are thrown
     * Execution is guaranteed to be in First In First Out order
     * @param channels
     * @param events
     * @param callback
     */
    subscribe: function(channels, events, callback) {
        if (typeof channels === "string") {
            let channel = channels;
            channels = [];
            channels.push(channel);
        }
        if (typeof events === "string") {
            let event = events;
            events = [];
            events.push(event);
        }
        channels.forEach(function(c) {
            events.forEach(function (e) {
                if (!WsSubscribers.__subscribers.hasOwnProperty(c)) {
                    WsSubscribers.__subscribers[c] = {};
                }
                if (!WsSubscribers.__subscribers[c].hasOwnProperty(e)) {
                    WsSubscribers.__subscribers[c][e] = [];
                    if (WsSubscribers.webSocketConnected) {
                        WsSubscribers.send("wsRelay", "register", `${c}:${e}`);
                    } else {
                        WsSubscribers.registerQueue.push(`${c}:${e}`);
                    }
                }
                WsSubscribers.__subscribers[c][e].push(callback);
            });
        })
    },
    clearEventCallbacks: function (channel, event) {
        if (WsSubscribers.__subscribers.hasOwnProperty(channel) && WsSubscribers.__subscribers[channel].hasOwnProperty(event)) {
            WsSubscribers.__subscribers[channel] = {};
        }
    },
    triggerSubscribers: function (channel, event, data) {
        if (WsSubscribers.__subscribers.hasOwnProperty(channel) && WsSubscribers.__subscribers[channel].hasOwnProperty(event)) {
            WsSubscribers.__subscribers[channel][event].forEach(function(callback) {
                if (callback instanceof Function) {
                    callback(data);
                }
            });
        }
    },
    send: function (channel, event, data) {
        if (typeof channel !== 'string') {
            console.error("Channel must be a string");
            return;
        }
        if (typeof event !== 'string') {
            console.error("Event must be a string");
            return;
        }
        if (channel === 'local') {
            this.triggerSubscribers(channel, event, data);
        } else {
            let cEvent = channel + ":" + event;
            WsSubscribers.webSocket.send(JSON.stringify({
                'event': cEvent,
                'data': data
            }));
        }
    }
};






//EDIT FROM HERE DOWN. DO NOT TOUCH THE ABOVE













//Variables for EVERYTHING
//Declare here if using across multiple function/need to keep the value for duration of series
//These will only refresh if source is refreshed or the values are set in code
var autoNames = true;
var timer = document.getElementById('timer');
var gameNumber = 1;
var gameText = document.getElementById('gameText');
var blueCount = 0;
var orangeCount = 0;

var blueName = document.getElementById('blueTeamName');
var blueScore = document.getElementById('blueScore');
var blueImg = document.getElementById('blueImg');;
var blue1 = document.getElementById('blueG1');
var blue2 = document.getElementById('blueG2');
var blue3 = document.getElementById('blueG3');
var blue4 = document.getElementById('blueG4');
var blue5 = document.getElementById('blueG5');

var orangeName = document.getElementById('orangeTeamName');
var orangeScore = document.getElementById('orangeScore');
var orangeImg = document.getElementById('orangeImg');;
var Orange1 = document.getElementById('orangeG1');
var Orange2 = document.getElementById('orangeG2');
var Orange3 = document.getElementById('orangeG3');
var Orange4 = document.getElementById('orangeG4');
var Orange5 = document.getElementById('orangeG5');

WsSubscribers.init(49322, true)
$(() => {
	WsSubscribers.subscribe("game", "update_state", (d) => {
	    var blueTeamName = d['game']['teams'][0]['name'];
        	    var orangeTeamName = d['game']['teams'][1]['name'];
        		blueScore.innerHTML = (d['game']['teams'][0]['score']);
        		orangeScore.innerHTML = (d['game']['teams'][1]['score']);
        		gameText.innerHTML = ("GAME " + gameNumber);

                if(autoNames == true){
                    blueName.innerHTML = (blueTeamName);
                    orangeName.innerHTML = (orangeTeamName);

                    blueImg.src = "Images/rli_logo.png";
                    orangeImg.src = "Images/rli_logo.png";
                }

        		var timeLeft = parseInt(d['game']['time_seconds']);
        		var m = Math.floor(timeLeft/60);
        		var s = (timeLeft - (m*60));
        		if(s.toString().length < 2){
        		s = "0" + s;
        		}
        		var TimeLeft = m + ":" + s;
        		if(d['game']['isOT'] == true){
        		TimeLeft = "+ " + TimeLeft;
        		}
        		timer.innerHTML = (TimeLeft);

	});

	WsSubscribers.subscribe("game", "match_ended", (e) => {
            if(e['winner_team_num'] == 0){
                if(blueCount == 0){
                  blue1.style.color = "#2ed8ff";
                  blueCount = 1;
                }else if(blueCount == 1){
                  blue2.style.color = "#2ed8ff";
                  blueCount = 2;
                }else if(blueCount == 2){
                  blue3.style.color = "#2ed8ff";
                  blueCount = 3;
                }else if(blueCount == 3){
                  blue4.style.color = "#2ed8ff";
                  blueCount = 4;
                }else if(blueCount == 4){
                  blue5.style.color = "#2ed8ff";
                  blueCount = 5;
                }
            }else{
                if(orangeCount == 0){
                  Orange1.style.color = "#ffcd2e";
                  orangeCount = 1;
                }else if(orangeCount == 1){
                  Orange2.style.color = "#ffcd2e";
                  orangeCount = 2;
                }else if(orangeCount == 2){
                  Orange3.style.color = "#ffcd2e";
                  orangeCount = 3;
                }else if(orangeCount == 3){
                  Orange4.style.color = "#ffcd2e";
                  orangeCount = 4;
                }else if(orangeCount == 4){
                   Orange5.style.color = "#ffcd2e";
                   orangeCount = 5;
               }
            }
            gameNumber++;
        });

});

$(".controller-container .controller-general-info .controller-tourney-abbrv-area .controller-button").click(function(){
        var i = document.getElementById("tourneyAbbrv").value.toUpperCase();
        $(".controller-container .rlis-overlay-tourney-area .rlis-overlay-tourney-top .rlis-overlay-tourney-info-area .rlis-overlay-tourney-text").text(i);
        WsSubscribers.send("tournament", "abbrv", i);
});

$(".controller-container .controller-general-info .controller-tourney-stage-area .controller-button01").click(function(){
        var i = document.getElementById("tourneyStage").value.toUpperCase();
        $(".controller-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-middle .rlis-overlay-stage-text").text(i);
        WsSubscribers.send("tournament", "stage", i);
});

$("#connect").click(function () {
  var ip = document.getElementById("IP").value;
  var port = document.getElementById("port").value;
  var password = document.getElementById("password").value;

  var info = {
      ip:ip,
      port:port,
      password:password
  };
  async function connectToObs(){
      await window.connectToObs();
  }

  window.connectToObs(ip, port, password);
  WsSubscribers.send("obs", "connect", info);
 
});


$("#disconnect").click(function(){
  async function disconnectObs(){
      await window.disconnectObs();
  }
  window.disconnectObs()
});


$(".controller-container .controller-general-info .controller-no-series-area .button").click(function(){
        var i = "Show Match";
        blueCount = 0;
        orangeCount = 0;
        blue1.style.visibility = "hidden";
        blue2.style.visibility = "hidden";
        blue3.style.visibility = "hidden";
        blue4.style.visibility = "hidden";
        blue5.style.visibility = "hidden";
        Orange1.style.visibility = "hidden";
        Orange2.style.visibility = "hidden";
        Orange3.style.visibility = "hidden";
        Orange4.style.visibility = "hidden";
        Orange5.style.visibility = "hidden";
        blue1.style.color = "#000";
        blue2.style.color = "#000";
        blue3.style.color = "#000";
        blue4.style.color = "#000";
        blue5.style.color = "#000";
        Orange1.style.color = "#000";
        Orange2.style.color = "#000";
        Orange3.style.color = "#000";
        Orange4.style.color = "#000";
        Orange5.style.color = "#000";
        WsSubscribers.send("series", "none", i);
        gameNumber = 1;
        gameText.innerHTML = ("GAME " + gameNumber);
        $(".controller-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
});

$(".controller-container .controller-general-info .controller-no-series-area .button01").click(function(){
        blueCount = 0;
        orangeCount = 0;
        var i = "BO3";
        blue1.style.visibility = "visible";
        blue2.style.visibility = "visible";
        blue3.style.visibility = "hidden";
        blue4.style.visibility = "hidden";
        blue5.style.visibility = "hidden";
        Orange1.style.visibility = "visible";
        Orange2.style.visibility = "visible";
        Orange3.style.visibility = "hidden";
        Orange4.style.visibility = "hidden";
        Orange5.style.visibility = "hidden";
        blue1.style.color = "#000";
        blue2.style.color = "#000";
        blue3.style.color = "#000";
        blue4.style.color = "#000";
        blue5.style.color = "#000";
        Orange1.style.color = "#000";
        Orange2.style.color = "#000";
        Orange3.style.color = "#000";
        Orange4.style.color = "#000";
        Orange5.style.color = "#000";
        WsSubscribers.send("series", "bo3", i);
        gameNumber = 1;
        gameText.innerHTML = ("GAME " + gameNumber);
        $(".controller-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
});

$(".controller-container .controller-general-info .controller-no-series-area .button02").click(function(){
        blueCount = 0;
        orangeCount = 0;
        var i = "BO5";
        blue1.style.visibility = "visible";
        blue2.style.visibility = "visible";
        blue3.style.visibility = "visible";
        blue4.style.visibility = "hidden";
        blue5.style.visibility = "hidden";
        Orange1.style.visibility = "visible";
        Orange2.style.visibility = "visible";
        Orange3.style.visibility = "visible";
        Orange4.style.visibility = "hidden";
        Orange5.style.visibility = "hidden";
        blue1.style.color = "#000";
        blue2.style.color = "#000";
        blue3.style.color = "#000";
        blue4.style.color = "#000";
        blue5.style.color = "#000";
        Orange1.style.color = "#000";
        Orange2.style.color = "#000";
        Orange3.style.color = "#000";
        Orange4.style.color = "#000";
        Orange5.style.color = "#000";
        WsSubscribers.send("series", "bo5", i);
        gameNumber = 1;
        gameText.innerHTML = ("GAME " + gameNumber);
        $(".controller-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
});

$(".controller-container .controller-general-info .controller-no-series-area .button03").click(function(){
        blueCount = 0;
        orangeCount = 0;
        var i = "BO7";
        blue1.style.visibility = "visible";
        blue2.style.visibility = "visible";
        blue3.style.visibility = "visible";
        blue4.style.visibility = "visible";
        blue5.style.visibility = "hidden";
        Orange1.style.visibility = "visible";
        Orange2.style.visibility = "visible";
        Orange3.style.visibility = "visible";
        Orange4.style.visibility = "visible";
        Orange5.style.visibility = "hidden";
        blue1.style.color = "#000";
        blue2.style.color = "#000";
        blue3.style.color = "#000";
        blue4.style.color = "#000";
        blue5.style.color = "#000";
        Orange1.style.color = "#000";
        Orange2.style.color = "#000";
        Orange3.style.color = "#000";
        Orange4.style.color = "#000";
        Orange5.style.color = "#000";
        WsSubscribers.send("series", "bo7", i);
        gameNumber = 1;
        gameText.innerHTML = ("GAME " + gameNumber);
        $(".controller-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
});

$(".controller-container .controller-general-info .controller-no-series-area .button04").click(function(){
        blueCount = 0;
        orangeCount = 0;
        var i = "BO9";
        blue1.style.visibility = "visible";
        blue2.style.visibility = "visible";
        blue3.style.visibility = "visible";
        blue4.style.visibility = "visible";
        blue5.style.visibility = "visible";
        Orange1.style.visibility = "visible";
        Orange2.style.visibility = "visible";
        Orange3.style.visibility = "visible";
        Orange4.style.visibility = "visible";
        Orange5.style.visibility = "visible";
        blue1.style.color = "#000";
        blue2.style.color = "#000";
        blue3.style.color = "#000";
        blue4.style.color = "#000";
        blue5.style.color = "#000";
        Orange1.style.color = "#000";
        Orange2.style.color = "#000";
        Orange3.style.color = "#000";
        Orange4.style.color = "#000";
        Orange5.style.color = "#000";
        WsSubscribers.send("series", "bo9", i);
        gameNumber = 1;
        gameText.innerHTML = ("GAME " + gameNumber);
        $(".controller-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
});

$(".controller-container .controller-overlay-body .controller-blue-controls .controller-container03 .controller-container05 .controller-button08").click(function(){
    var i = 1
    if(blueCount == 0){
      blue1.style.color = "#2ed8ff";
      blueCount = 1;
    }else if(blueCount == 1){
      blue2.style.color = "#2ed8ff";
      blueCount = 2;
    }else if(blueCount == 2){
      blue3.style.color = "#2ed8ff";
      blueCount = 3;
    }else if(blueCount == 3){
      blue4.style.color = "#2ed8ff";
      blueCount = 4;
    }else if(blueCount == 4){
      blue5.style.color = "#2ed8ff";
      blueCount = 5;
    }
    gameNumber += 1;
    gameText.innerHTML = ("GAME " + gameNumber);
    WsSubscribers.send("series", "BluePlus", i);
});
$(".controller-container .controller-overlay-body .controller-blue-controls .controller-container03 .controller-container05 .controller-button09").click(function(){
    var i = 1
    if(blueCount == 5){
      blue5.style.color = "#000";
      blueCount = 4;
    }else if(blueCount == 4){
      blue4.style.color = "#000";
      blueCount = 3;
    }else if(blueCount == 3){
      blue3.style.color = "#000";
      blueCount = 2;
    }else if(blueCount == 2){
      blue2.style.color = "#000";
      blueCount = 1;
    }else if(blueCount == 1){
      blue1.style.color = "#000";
      blueCount = 0;
    }
    gameNumber -= 1;
    gameText.innerHTML = ("GAME " + gameNumber);
    WsSubscribers.send("series", "BlueMinus", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container06 .controller-container08 .controller-button10").click(function(){
    var i = 1
    if(orangeCount == 0){
      Orange1.style.color = "#ffcd2e";
      orangeCount = 1;
    }else if(orangeCount == 1){
      Orange2.style.color = "#ffcd2e";
      orangeCount = 2;
    }else if(orangeCount == 2){
      Orange3.style.color = "#ffcd2e";
      orangeCount = 3;
    }else if(orangeCount == 3){
      Orange4.style.color = "#ffcd2e";
      orangeCount = 4;
    }else if(orangeCount == 4){
       Orange5.style.color = "#ffcd2e";
       orangeCount = 5;
   }
   gameNumber += 1;
   gameText.innerHTML = ("GAME " + gameNumber);
    WsSubscribers.send("series", "OrangePlus", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container06 .controller-container08 .controller-button11").click(function(){
    var i = 1
    if(orangeCount == 5){
      Orange5.style.color = "#000";
      orangeCount = 4;
    }else if(orangeCount == 4){
      Orange4.style.color = "#000";
      orangeCount = 3;
    }else if(orangeCount == 3){
      Orange3.style.color = "#000";
      orangeCount = 2;
    }else if(orangeCount == 2){
      Orange2.style.color = "#000";
      orangeCount = 1;
    }else if(orangeCount == 1){
      Orange1.style.color = "#000";
      orangeCount = 0;
    }
    gameNumber -= 1;
    gameText.innerHTML = ("GAME " + gameNumber);
    WsSubscribers.send("series", "OrangeMinus", i);
});

$(".controller-container .controller-overlay-body .controller-blue-controls .controller-blue-team-names .controller-container02 .controller-button02").click(function(){
    var i = 1;
    blueName.innerHTML = "Giants";
    blueImg.src = "Images/giants_no_text.png";
    WsSubscribers.send("Team", "blueGiants", i);
});
$(".controller-container .controller-overlay-body .controller-blue-controls .controller-blue-team-names .controller-container02 .controller-button03").click(function(){
    var i = 1;
    blueName.innerHTML = "Wolfhounds";
    blueImg.src = "Images/irish_wolfhounds_no_text.png";
    WsSubscribers.send("Team", "blueWolf", i);
});
$(".controller-container .controller-overlay-body .controller-blue-controls .controller-blue-team-names .controller-container02 .controller-button04").click(function(){
    var i = 1;
    blueName.innerHTML = "Banshees";
    blueImg.src = "Images/the_banshees_no_text.png";
    WsSubscribers.send("Team", "blueBanshee", i);
});
$(".controller-container .controller-overlay-body .controller-blue-controls .controller-blue-team-names .controller-container02 .controller-button05").click(function(){
    var i = 1;
    blueName.innerHTML = "High Kings";
    blueImg.src = "Images/the_high_kings_no_text.png";
    WsSubscribers.send("Team", "blueKings", i);
});
$(".controller-container .controller-overlay-body .controller-blue-controls .controller-blue-team-names .controller-container02 .controller-button06").click(function(){
    var i = 1;
    blueName.innerHTML = "Setanta";
    blueImg.src = "Images/setanta_no_text.png";
    WsSubscribers.send("Team", "blueSetanta", i);
});
$(".controller-container .controller-overlay-body .controller-blue-controls .controller-blue-team-names .controller-container02 .controller-button07").click(function(){
    var i = 1;
    blueName.innerHTML = "The Saints";
    blueImg.src = "Images/the_saints_no_text.png";
    WsSubscribers.send("Team", "blueSaints", i);
});

$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button12").click(function(){
    var i = 1;
    orangeName.innerHTML = "Giants";
    orangeImg.src = "Images/giants_no_text.png";
    WsSubscribers.send("Team", "orangeGiants", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button13").click(function(){
    var i = 1;
    orangeName.innerHTML = "Wolfhounds";
    orangeImg.src = "Images/irish_wolfhounds_no_text.png";
    WsSubscribers.send("Team", "orangeWolf", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button14").click(function(){
    var i = 1;
    orangeName.innerHTML = "Banshees";
    orangeImg.src = "Images/the_banshees_no_text.png";
    WsSubscribers.send("Team", "orangeBanshee", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button15").click(function(){
    var i = 1;
    orangeName.innerHTML = "High Kings";
    orangeImg.src = "Images/the_high_kings_no_text.png";
    WsSubscribers.send("Team", "orangeKings", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button16").click(function(){
    var i = 1;
    orangeName.innerHTML = "Setanta";
    orangeImg.src = "Images/setanta_no_text.png";
    WsSubscribers.send("Team", "orangeSetanta", i);
});
$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button17").click(function(){
    var i = 1;
    orangeName.innerHTML = "The Saints";
    orangeImg.src = "Images/the_saints_no_text.png";
    WsSubscribers.send("Team", "orangeSaints", i);
});

$(".controller-container .controller-overlay-body .controller-orange-controls .controller-container09 .controller-container11 .controller-button17").click(function(){
    var i = 1;
    orangeName.innerHTML = "The Saints";
    orangeImg.src = "Images/the_saints_no_text.png";
    WsSubscribers.send("Team", "orangeSaints", i);
});

$('#autoNames').click(function() {
    if ($('#autoNames').prop('checked') == true) {
      autoNames = true;
      WsSubscribers.send("Scoreboard", "Names", autoNames);
    } else {
      autoNames = false;
      WsSubscribers.send("Scoreboard", "Names", autoNames);
    }
});
