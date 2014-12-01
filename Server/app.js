// Create Mopidy
var Mopidy = require('mopidy'),
    mopidy = new Mopidy({
        webSocketUrl: "ws://localhost:6680/mopidy/ws/"
    }),
    state = 'waiting';

// Init Mopidy 
mopidy.on('state:online', function () {
    
    mopidy.tracklist.setConsume(true);

    var defaultUri = 'spotify:user:lomejordespotifyenargentina:playlist:1K3CWZMz6B8Q3p4fcEK8UY'; 

    mopidy.library.lookup(defaultUri)
        .then( function (tracklist) {

            mopidy.tracklist.clear();
            mopidy.tracklist.add(tracklist);
            mopidy.playback.play();
        });
});

// Create Web Socket
var WebSocket = require('ws'),
    ws = new WebSocket('ws://localhost:8080');

ws.on('message', router);

function router (message) {
    
    message = JSON.parse(message);
    
    if(message.type == 'add') add(message.data);
    // if(message.type == 'getTracklist') getTracklist();
}

function add (uri) {

    mopidy.library.lookup(uri)
        .then( function (track) {

            if(state == 'waiting') {
                
                mopidy.tracklist.clear();
                mopidy.tracklist.add(track);
                mopidy.playback.play();

                state = 'starting';
            }
            else mopidy.tracklist.add(track);
        });
}

mopidy.on('event:tracklistChanged', tracklistChanged);

function tracklistChanged () {
    console.log( "tracklistChanged" );
    
    var tracklist = [];

    if (state == 'initiated' || state == 'starting'){

        console.log( "send new tracklist" );

        mopidy.tracklist.getTracks()
            .done( function(tracks){

                for( i = 0; i < tracks.length; i++){

                    var track= {
                        name: tracks[i].name,
                        album: tracks[i].album.name,
                        uri: tracks[i].uri
                    };

                    tracklist[i] = track;
                }

                ws.send(
                    JSON.stringify( {type: 'newTracklist', data: tracklist} )
                );
            });
    }
}

mopidy.on('event:trackPlaybackStarted', function (data) {

    if (state == 'starting' || state == 'initiated') {
        
        state = 'initiated';
        
        // var track = {
        //     name: data.tl_track.track.name,
        //     album: data.tl_track.track.album.name,
        //     uri: data.tl_track.track.uri
        // };

        // ws.send(JSON.stringify( {type: 'started', data: track} ));

        // getTracklist();
    }
});

mopidy.on('event:trackPlaybackEnded', function (tlTrack) {
    if(state == 'initiated')
        ws.send( JSON.stringify( {type: 'ended'} ) );
});

// function getTracklist () {

//     if(state == 'initiated'){

//         mopidy.tracklist.getTracks()
//             .done( function(tracks){

//                 var tracklist = [];

//                 for( i = 0; i < tracks.length; i++){

//                     var track= {
//                         name: tracks[i].name,
//                         album: tracks[i].album.name,
//                         uri: tracks[i].uri
//                     };

//                     tracklist[i] = track;
//                 }

//                 ws.send(
//                     JSON.stringify( {type: 'tracklist', data: tracklist} )
//                 );
//             });
//     }
// }
