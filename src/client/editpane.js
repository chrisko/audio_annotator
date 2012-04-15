// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Display an edit pane beneath the selected (or new) segment.

function EditPane(delegate, parent_id, clip, segments) {
    this.delegate = delegate;
    this.parent_id = parent_id;
    this.clip = clip;

    this.template = _.template($("#segment-edit-pane").html());

    // To add new segments or edit existing ones, we need to be given access
    // to the SegmentsList object, which contains all of them and syncs with
    // the server via the Backbone sync() method.
    this.segments = segments;

    this.delegate.on("selection:finalized", this.new_segment, this);
    this.delegate.on("segment:clicked", this.edit_segment, this);
}

EditPane.prototype.new_segment = function (start, end) {
    // If it was just a click (not a drag), don't create a new segment:
    if (start == end) return;
    console.log("new segment!");

    // First, create the new segment. The { wait: true } means to wait
    // until the server gets back to us before adding it to our set.
    var segment = this.segments.collection.create({
        // The "start" and "end" parameters are given as 0-1 values, for
        // how far along the clip the selection happened.
        start: this.clip.get("duration") * start,
        end: this.clip.get("duration") * end
    }, { wait: true });

    // The clip should be rendered as soon as we add it above, thanks to the
    // Backbone Collection's "add" event that we bound to over in Segments.

    // Then go edit the segment. It'll check the isNew() attribute and
    // realize we haven't yet synced this segment to the server.
    this.edit_segment(segment);
};

EditPane.prototype.edit_segment = function (segment) {
    $(".tooltip").removeClass("in");

    // For convenience, store the jQuery elements we'll be using:
    var editpane = this;
    var $editpane = $("#edit-pane");
    var $rect = $("#segment-" + segment.id + "-rect");

    // Hide the existing edit pane while we make the following changes:
    $editpane.css("visibility", "hidden");
    // Gut the contents, if any, by giving this segment to the template:
    $editpane.html(this.template({ label: segment.get("label") || "" }));

    // Adjust the edit pane position to be just under this segment:
    $editpane.css("left", $rect.attr("x") + 0.5 * $rect.attr("width"));
    $editpane.css("top", $rect.attr("y") + $rect.attr("height"));

    // If the user hits enter while typing, automatically trigger a submit:
    $("#edit-pane .tooltip .input-label").on("keydown", function (e) {
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 13) {
            $("#edit-pane .tooltip .submit-segment").click();
            editpane.remove_tooltip();
            e.preventDefault();
            return false;
        }
    });

    // And as soon as we lose focus, fade out the edit pane:
    $("#edit-pane .tooltip .input-label").on("blur", function () {
        editpane.remove_tooltip();
    });

    // If the user hits "Delete", remove this segment. Issues a DELETE request.
    $("#edit-pane .tooltip .delete-segment").on("click", function () {
        editpane.remove_tooltip();
        if (segment && segment.url()) {
            segment.destroy({
                success: function () {
                    $("segment-" + segment.id + "-group").remove();
                },
                failure: function (err) {
                    console.log(err);
                }
            });
        }
    });

    // If the "Submit" button's clicked (or if they hit enter) make a change:
    $("#edit-pane .tooltip .submit-segment").on("click", function () {
        var new_label = $("#edit-pane .tooltip .input-label").val();
        // This should trigger a Backbone sync() to the server:
        segment.set("label", new_label);
        editpane.remove_tooltip();
    });

    // Don't remember to make the edit pane visible after our changes:
    $editpane.css("visibility", "visible");
    // And change focus to the label input field:
    $("#edit-pane .tooltip .input-label").focus();

    // If we just made a selection to add a new segment, it hasn't yet been
    // synced to the server. Do that now, issuing a POST.
    if (segment.isNew())
        segment.save();
};

EditPane.prototype.remove_tooltip = function () {
    // Trigger the tooltip fade animation by removing the "in" class:
    $("#edit-pane .tooltip").removeClass("in");

    // And after the fade's done (in 500ms by default) remove the pane:
    setTimeout(function () {
        $("#edit-pane .tooltip").remove();
    }, 500);
};
