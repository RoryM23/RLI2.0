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
var assistBoolean = false;
var replayBanner = document.getElementById("replayBanner");
var assistArea = document.getElementById("assistArea");
var connected = false;
var timeLeft = 0;

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

$(() => {
	WsSubscribers.init(49322, true)
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

		timeLeft = parseInt(d['game']['time_seconds']);
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


        //Spectating Specific Variables
		var blueMembers = 0;
		var orangeMembers = 0;
		let bluePlayerBoost1 = document.getElementById("bluePlayerBoost1");
		let bluePlayerBoost2 = document.getElementById("bluePlayerBoost2");
		let bluePlayerBoost3 = document.getElementById("bluePlayerBoost3");
		let orangePlayerBoost1 = document.getElementById("orangePlayerBoost1");
		let orangePlayerBoost2 = document.getElementById("orangePlayerBoost2");
		let orangePlayerBoost3 = document.getElementById("orangePlayerBoost3");

		let bluePlayer1 = document.getElementById("bluePlayerName1");
		let bluePlayer2 = document.getElementById("bluePlayerName2");
		let bluePlayer3 = document.getElementById("bluePlayerName3");
		let orangePlayer1 = document.getElementById("orangePlayerName1");
		let orangePlayer2 = document.getElementById("orangePlayerName2");
		let orangePlayer3 = document.getElementById("orangePlayerName3");
		let activeBlue = "linear-gradient(to right, #001024, #004478)";
		let inactiveBlue = "linear-gradient(to right, #003576, #007ad8)";
		let activeOrange = "linear-gradient(to left, #683400, #b45500)";
		let inactiveOrange = "linear-gradient(to left, #ae5600, #f77400)";
		let demoedBlue = "linear-gradient(to left, #bbbbbb, #525252)";
		let demoedOrange = "linear-gradient(to left, #525252, #bbbbbb)";
		//I don't remember adding these next 2 icl
		let testActiveBlue = "linear-gradient(to left, #bbbbbb, #525252)";
		let testActiveOrange = "linear-gradient(to left, #ae5600, #f77400)";

		Object.keys(d['players']).forEach((id) => {
		    if(d['players'][id].team == 0){
		        blueMembers += 1;
		        let blueSpectating = document.getElementById("bluePlayerName" + blueMembers);
		        if(d['game']['isReplay'] == false){
                    blueSpectating.style.visibility = 'visible';
                }

		        var gradientAmount = "linear-gradient(to left, #2c2c2c " + (100 - d['players'][id].boost) + "%, #ffa500 0%, #e09100)";
		        $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-top-left-spacer .rlis-overlay-blue-names .rlis-overlay-blue-name-area" + blueMembers + " .rlis-overlay-blue-name-text" + blueMembers).text(d['players'][id].name);

		        if (d['players'][id].id == d['game']['target']) {
		            orangePlayer1.style.background = inactiveOrange;
		            orangePlayer2.style.background = inactiveOrange;
		            orangePlayer3.style.background = inactiveOrange;
		            if((blueMembers - 3) == 0){
		                bluePlayer3.style.background = activeBlue;
		                bluePlayer2.style.background = inactiveBlue;
		                bluePlayer1.style.background = inactiveBlue;
		            }else if((blueMembers - 3) == -1){
		                bluePlayer2.style.background = activeBlue;
                        bluePlayer3.style.background = inactiveBlue;
                        bluePlayer1.style.background = inactiveBlue;
		            }else if((blueMembers - 3) == -2){
                        bluePlayer1.style.background = activeBlue;
                        bluePlayer3.style.background = inactiveBlue;
                        bluePlayer2.style.background = inactiveBlue;
		            }
		        }

		        if(blueMembers == 1){
                    bluePlayerBoost1.style.background = gradientAmount;
                }else if(blueMembers == 2){
                    bluePlayerBoost2.style.background = gradientAmount;
                }else if(blueMembers == 3){
                    bluePlayerBoost3.style.background = gradientAmount;
                }

		    }else if(d['players'][id].team == 1){
                orangeMembers += 1;
                let orangeSpectating = document.getElementById("orangePlayerName" + orangeMembers);
                if(d['game']['isReplay'] == false){
                    orangeSpectating.style.visibility = 'visible';
                }

                var gradientAmount = "linear-gradient(to right, #2c2c2c " + (100 - d['players'][id].boost) + "%, #ffa500 0%, #e09100)";
                $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-top-right-spacer .rlis-overlay-orange-names .rlis-overlay-orange-name-area" + orangeMembers + " .rlis-overlay-orange-name-text" + orangeMembers).text(d['players'][id].name);

                if (d['players'][id].id == d['game']['target']) {
                    bluePlayer1.style.background = inactiveBlue;
                    bluePlayer2.style.background = inactiveBlue;
                    bluePlayer3.style.background = inactiveBlue;
                    if((orangeMembers - 3) == 0){
                        orangePlayer3.style.background = activeOrange;
                        orangePlayer2.style.background = inactiveOrange;
                        orangePlayer1.style.background = inactiveOrange;
                    }else if((orangeMembers - 3) == -1){
                        orangePlayer2.style.background = activeOrange;
                        orangePlayer3.style.background = inactiveOrange;
                        orangePlayer1.style.background = inactiveOrange;
                    }else if((orangeMembers - 3) == -2){
                        orangePlayer1.style.background = activeOrange;
                        orangePlayer2.style.background = inactiveOrange;
                        orangePlayer3.style.background = inactiveOrange;
                    }
                }

                if(orangeMembers == 1){
                    orangePlayerBoost1.style.background = gradientAmount;
                }else if(orangeMembers == 2){
                    orangePlayerBoost2.style.background = gradientAmount;
                }else if(orangeMembers == 3){
                    orangePlayerBoost3.style.background = gradientAmount;
                }
		    }

            if(d['game']['isReplay'] == true){
                orangePlayer1.style.visibility = 'hidden';
                orangePlayer2.style.visibility = 'hidden';
                orangePlayer3.style.visibility = 'hidden';
                bluePlayer1.style.visibility = 'hidden';
                bluePlayer2.style.visibility = 'hidden';
                bluePlayer3.style.visibility = 'hidden';
            }
            if(d['game']['hasWinner'] == true){
                orangePlayer1.style.visibility = 'hidden';
                orangePlayer2.style.visibility = 'hidden';
                orangePlayer3.style.visibility = 'hidden';
                bluePlayer1.style.visibility = 'hidden';
                bluePlayer2.style.visibility = 'hidden';
                bluePlayer3.style.visibility = 'hidden';
            }
        });

        blueMembers = 0;
        orangeMembers = 0;
        Object.keys(d['players']).forEach((id) => {
            if(d['players'][id].team == 0){
                blueMembers += 1;
                if(blueMembers == 1){
                    if(d['players'][id].isDead == true){
                        bluePlayer1.style.background = demoedBlue;
                    }
                }else if(blueMembers == 2){
                    if(d['players'][id].isDead == true){
                        bluePlayer2.style.background = demoedBlue;
                    }
                }else if(blueMembers == 3){
                    if(d['players'][id].isDead == true){
                        bluePlayer3.style.background = demoedBlue;
                    }
                }
            }else if(d['players'][id].team == 1){
                orangeMembers += 1;
                if(orangeMembers == 1){
                    if(d['players'][id].isDead == true){
                        orangePlayer1.style.background = demoedOrange;
                    }
                }else if(orangeMembers == 2){
                    if(d['players'][id].isDead == true){
                        orangePlayer2.style.background = demoedOrange;
                    }
                }else if(orangeMembers == 3){
                    if(d['players'][id].isDead == true){
                        orangePlayer3.style.background = demoedOrange;
                    }
                }
            }
        });
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

    WsSubscribers.subscribe("game", "goal_scored", (e) => {
        var scorer = " " + e['scorer']['name'];
        $(".rlis-overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-scored-by-area .overlay-scored-by-player-name").text(scorer);
        if(e['scorer']['teamnum'] == 0){
        var gradientAmount = "linear-gradient(to top, #003576, #0000 85%)";
        replayBanner.style.background = gradientAmount;
        }else{
        var gradientAmount = "linear-gradient(to top, #ae5600, #0000 85%)";
        replayBanner.style.background = gradientAmount;
        }
        if(e['assister']['name'] == ""){
        $(".rlis-overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-assist-area .overlay-assist-player-name").text("None");
        assistArea.style.visibility = "hidden";
        assistBoolean = false;
        }else{
        var assister = " " + e['assister']['name'];
        $(".rlis-overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-assist-area .overlay-assist-player-name").text(assister);
        assistBoolean = true;
        }
        var goalSpeed = " " +  Math.round(e['goalspeed']) + " KM/H";
        $(".rlis-overlay-container .overlay-overlay-bottom .overlay-replay-banner .overlay-replay-stats-area .overlay-speed-area .overlay-speed-value").text(goalSpeed);

        async function obsSceneChange() {
            await window.changeScene('Replay');
        }
        obsSceneChange();
    });

    WsSubscribers.subscribe("game", "replay_start", (e) => {
        if(assistBoolean == false){
            assistArea.style.visibility = "hidden";
        }
    });

    WsSubscribers.subscribe("game", "replay_end", (e) => {
        assistArea.style.visibility = "visible";
        async function obsSceneChange() {
            await window.changeScene('Gameplay');
        }
        obsSceneChange();
    });

    WsSubscribers.subscribe("obs", "connect", (e) => { // connect to obs websocket with info from control panel
        async function connectToObs(){
            await window.connectToObs();
        }
        window.connectToObs(e.ip, e.port, e.password);
        connected == true;
        WsSubscribers.send("obs", "connected", connected);
    });

    WsSubscribers.subscribe("obs", "disconnect", (e) => { // disconnect from obs
        async function disconnectObs(){
            await window.disconnectObs();
        }
        window.disconnectObs();
        connected == false;
        WsSubscribers.send("obs", "disconnected", connected);
    });
    
    WsSubscribers.subscribe("tournament", "abbrv", (e) => {
            $(".rlis-overlay-container .rlis-overlay-tourney-area .rlis-overlay-tourney-top .rlis-overlay-tourney-info-area .rlis-overlay-tourney-text").text(e);
    });

    WsSubscribers.subscribe("tournament", "stage", (e) => {
        $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-middle .rlis-overlay-stage-text").text(e);
    });

    WsSubscribers.subscribe("series", "none", (e) => {
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
            gameNumber = 1;
            gameText.innerHTML = ("GAME " + gameNumber);
            $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
    });

    WsSubscribers.subscribe("series", "bo3", (e) => {
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
            gameNumber = 1;
            gameText.innerHTML = ("GAME " + gameNumber);
            $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
    });

    WsSubscribers.subscribe("series", "bo5", (e) => {
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
            $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
    });

    WsSubscribers.subscribe("series", "bo7", (e) => {
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
            gameNumber = 1;
            gameText.innerHTML = ("GAME " + gameNumber);
            $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
    });

    WsSubscribers.subscribe("series", "bo9", (e) => {
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
            gameNumber = 1;
            gameText.innerHTML = ("GAME " + gameNumber);
            $(".rlis-overlay-container .rlis-overlay-overlay-top .rlis-overlay-scoreboard .rlis-overlay-scoreboard-bottom .rlis-overlay-info-area .rlis-overlay-info-area-right .rlis-overlay-info-right-text").text(i);
    });

    WsSubscribers.subscribe("series", "BluePlus", (e) => {
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
    });
    WsSubscribers.subscribe("series", "BlueMinus", (e) => {
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
    });
    WsSubscribers.subscribe("series", "OrangePlus", (e) => {
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
    });
    WsSubscribers.subscribe("series", "OrangeMinus", (e) => {
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
    });

    WsSubscribers.subscribe("Team", "blueGiants", (e) => {
        blueName.innerHTML = "GIANTS";
        blueImg.src = "Images/giants_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueWolf", (e) => {
        blueName.innerHTML = "WOLFHOUNDS";
        blueImg.src = "Images/irish_wolfhounds_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueBanshee", (e) => {
        blueName.innerHTML = "BANSHEES";
        blueImg.src = "Images/the_banshees_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueKings", (e) => {
        blueName.innerHTML = "HIGH KINGS";
        blueImg.src = "Images/the_high_kings_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueSetanta", (e) => {
        blueName.innerHTML = "SETANTA";
        blueImg.src = "Images/setanta_no_text.png";
    });
    WsSubscribers.subscribe("Team", "blueSaints", (e) => {
        blueName.innerHTML = "THE SAINTS";
        blueImg.src = "Images/the_saints_no_text.png";
    });

    WsSubscribers.subscribe("Team", "orangeGiants", (e) => {
        orangeName.innerHTML = "GIANTS";
        orangeImg.src = "Images/giants_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeWolf", (e) => {
        orangeName.innerHTML = "WOLFHOUNDS";
        orangeImg.src = "Images/irish_wolfhounds_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeBanshee", (e) => {
        orangeName.innerHTML = "BANSHEES";
        orangeImg.src = "Images/the_banshees_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeKings", (e) => {
        orangeName.innerHTML = "HIGH KINGS";
        orangeImg.src = "Images/the_high_kings_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeSetanta", (e) => {
        orangeName.innerHTML = "SETANTA";
        orangeImg.src = "Images/setanta_no_text.png";
    });
    WsSubscribers.subscribe("Team", "orangeSaints", (e) => {
        orangeName.innerHTML = "THE SAINTS";
        orangeImg.src = "Images/the_saints_no_text.png";
    });

    WsSubscribers.subscribe("Scoreboard", "Names", (e) => {
        autoNames = e;
    });

});
