RECORDERJS_URL="https://github.com/jwagener/recorder.js"
RECORDERJS_SHA1="348095255e08740d92d2f6326f0dfef98978ff09"
SOUNDMANAGER_URL="https://github.com/scottschiller/SoundManager2"
SOUNDMANAGER_SHA1="8d9213ea0bc8aa37aec7c9676087423397aa019d"

site: site/static
	@cp -r src/static/* site/static/

site/static: site
	@mkdir -p site/static
	# Fetch the recorder.js static files:
	@cd site/static \
	 && wget "$(RECORDERJS_URL)/raw/$(RECORDERJS_SHA1)/recorder.js" \
	 && wget "$(RECORDERJS_URL)/raw/$(RECORDERJS_SHA1)/recorder.swf"
	# Fetch the SoundManager2 static files:
	@cd site/static \
	 && wget "$(SOUNDMANAGER_URL)/raw/$(SOUNDMANAGER_SHA1)/script/soundmanager2.js" \
	 && wget "$(SOUNDMANAGER_URL)/raw/$(SOUNDMANAGER_SHA1)/swf/soundmanager2_debug.swf"

clean:
	rm -rf site/

PHONY: clean