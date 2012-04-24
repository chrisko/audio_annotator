Audio Annotator
===============

Need a web interface for playing and marking boundaries in audio files? Got
speech clips, and want to manually mark individual words? Is your team of
annotators distributed? You might find this project useful.

It provides both a backend server component for hosting and a frontend web app,
handling visualization and interactions with the backend. You can also record
clips right in the browser (requires Flash) and get a waveform/spectrogram
reading in a short amount of time.

![Audio Annotator Interface](http://chrisko.github.com/audio_annotator/interface.png)

Installation
------------

The software has a few requirements:
- Both [node](http://nodejs.org/) and [npm](http://npmjs.org/) must be installed.
- A redis server should be running locally on the default port (`6379`).

It's provided as a private [npm](http://npmjs.org/) package, so normal npm
commands are used:

- `npm install`: Fetches dependent npm packages and resources from the web.
- `npm start`: Brings up the server on port 3000, daemonizes using forever.
- `npm stop`: Brings down the server, using forever to check if it's running.

Usage
-----

Upon bringing up the server, you can visit the following URLs:
* `http://localhost:3000/`: The list of clips.
* `http://localhost:3000/#record`: The recording interface.
* `http://localhost:3000/#clips/<id>`: The view for a particular clip.

When viewing a clip, the space bar will initiate or pause playback, and
dragging over an area will produce a segment. Segments are persisted to
the server, and should synchronize with other open clients.

Open Problems
-------------

* No zooming or panning within a clip.
* Performs poorly on long (3+ min.) audio files.
* Playback often overshoots the end marker.
* Waveform generation shouldn't be on the client.
* Too much data sent to client: full wav, plus samples.
