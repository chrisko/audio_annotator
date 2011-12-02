# Third-party files for static serving:
RECORDERJS_URL="https://github.com/jwagener/recorder.js"
RECORDERJS_SHA1="348095255e08740d92d2f6326f0dfef98978ff09"
SOUNDMANAGER_URL="https://github.com/scottschiller/SoundManager2"
SOUNDMANAGER_SHA1="8d9213ea0bc8aa37aec7c9676087423397aa019d"
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
