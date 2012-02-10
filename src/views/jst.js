window.JST = {};

window.JST["clips/list"] = _.template(
    "<ul class=\"playlist dark\">"
  + "<%= _.each(clips, function (clip) { %>"
  + "<li><a href=\"clip/<%= id %>\"><%= name %></a></li>"
  + "<%= }); =>");

window.JST["clips/view"] = _.template(
    "<center>"
  + "<img id=\"spectrogram\" src=\"<%= id %>/spectrogram\">"
  + "<div id=\"waveform\"></div>"
  + "</center>");
