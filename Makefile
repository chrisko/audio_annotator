# Third-party files for static serving:
RECORDERJS_URL="https://github.com/jwagener/recorder.js"
RECORDERJS_SHA1="881498c1b8dbb8b10bc480be6fbad8b723fb1895"

SOUNDMANAGER_URL="https://github.com/scottschiller/SoundManager2"
SOUNDMANAGER_SHA1="8d9213ea0bc8aa37aec7c9676087423397aa019d"

RAPHAELJS_URL="https://github.com/DmitryBaranovskiy/raphael"
RAPHAELJS_SHA1="300aa589f5a0ba7fce667cd62c7cdda0bd5ad904"

JQUERY_URL="http://code.jquery.com"
JQUERY_VERSION="1.7"

run: site
	@node src/languishes.js

site: site/static site/data
	@cp -r src/static/* site/static/

site/static: site/static/3rd_party.txt site/static/languishes.txt

site/static/languishes.txt: src/waveform.js
	@cp src/waveform.js site/static/
	@touch site/static/languishes.txt

site/static/3rd_party.txt:
	@mkdir -p site/static
	
	@# Fetch the recorder.js static files:
	@cd site/static \
	 && wget "$(RECORDERJS_URL)/raw/$(RECORDERJS_SHA1)/recorder.js" \
	 && wget "$(RECORDERJS_URL)/raw/$(RECORDERJS_SHA1)/recorder.swf"
	
	@# Fetch the SoundManager2 static files:
	@cd site/static \
	 && wget "$(SOUNDMANAGER_URL)/raw/$(SOUNDMANAGER_SHA1)/script/soundmanager2.js" \
	 && wget "$(SOUNDMANAGER_URL)/raw/$(SOUNDMANAGER_SHA1)/swf/soundmanager2.swf" \
	 && wget "$(SOUNDMANAGER_URL)/raw/$(SOUNDMANAGER_SHA1)/swf/soundmanager2_debug.swf"
	@mkdir -p site/static/css
	@cd site/static/css \
	 && wget "$(SOUNDMANAGER_URL)/raw/$(SOUNDMANAGER_SHA1)/demo/page-player/css/page-player.css"
	
	@# Get the Raphael version specified:
	@cd site/static \
	 && wget "$(RAPHAELJS_URL)/raw/$(RAPHAELJS_SHA1)/raphael.js"
	
	@# And grab a particular jQuery version from the jQuery CDN, as well:
	@cd site/static \
	 && wget "$(JQUERY_URL)/jquery-$(JQUERY_VERSION).js"
	@cp site/static/jquery-$(JQUERY_VERSION).js site/static/jquery.js
	@touch site/static/3rd_party.txt

site/data:
	@mkdir -p site/data
	@# And copy in some test data, just for convenience:
	@ls ~/src/classes/ling120/demo/wav/* | head | xargs -IWAV cp WAV ./site/data/

clean:
	rm -rf site/

PHONY: clean
