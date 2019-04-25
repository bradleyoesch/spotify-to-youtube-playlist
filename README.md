# Spotify to Youtube Playlist

This is a node app that creates a Youtube playlist of music videos from a Spotify playlist.

`WIP: It currently does not actually create the Youtube playlist.`

* Authenticate with Spotify
* Get tracks for a playlist
* Make Youtube queries to get music videos for those tracks
* Create a Youtube playlist of those music videos

## Installation

This runs on Node.js. On [its website](http://www.nodejs.org/download/) you can find instructions on how to install it. You can also follow [this gist](https://gist.github.com/isaacs/579814) for a quick and easy way to install Node.js and npm.

Once installed, clone the repository and install its dependencies running:

    $ npm install

### Using your own credentials
You will need to register your Spotify app and get your own credentials from the Spotify for Developers Dashboard.

To do so, go to [your Spotify for Developers Dashboard](https://beta.developer.spotify.com/dashboard) and create your application.

You will also need to register your Youtube app and get your own credentials from Google Apis.

To do so, go to [Youtube's Getting Started page](https://developers.google.com/youtube/v3/getting-started) and follow the instructions to get a YouTube Data API v3 API key.

Once you have created your apps, copy the secrets file to an actual secrets file and update your secrets.

    $ cp src/secrets.js.bak src/secrets.js

## Running the code
Run via node with some arguments.
Find the url by going to a Spotify playlist > Three dots > Share > Copy Playlist Link.
Give a limit if you want. It has a low default for testing purposes.

    $ node src/app.js --url https://open.spotify.com/user/1235822306/playlist/w2gv2ZWcO6oyJ9P1JlFP9U?si=QDuxxT_1Ka8OzHcOQDbJHg --limit 50

### Arguments

Arg | Default | Purpose
--- | --- | ---
--url | None, url or id is required | App parses the Spotify playlist url to get playlist id
--id | None, url or id is required | Or just pass in the playlist id directly
--chunkSize | 5 | Chunk your Youtube requests so you don't make tons of calls at once
--limit | 5 | Limits the number of tracks returned by Spotify, low for testing purposes
--offset | 0 | Offsets the track start returned by Spotify, mainly for testing purposes
-debug | False | Log more things in the console with this flag
-debugScore | False | Log more score things in the console with this flag
-skipApi | False | Skip all the api calls, probably to play around with the args
-skipYoutube | False | Skips Youtube api calls, since their quota limit is pathetically low
