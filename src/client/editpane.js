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

    // The above { wait: true } means the rendering won't complete until the
    // server gets back to us with an id. Wait for that to happen.
    var ep = this;
    segment.on("segment:rendered", _.once(function () {
        // Then go open a regular old edit pane around this new segment:
        ep.edit_segment(segment);
        return false;
    }));
};

EditPane.prototype.edit_segment = function (segment) {
    // Fade out any and all tooltips, including the "Click to edit" ones:
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
    var rect = d3.select("#segment-" + segment.id + "-rect");
    var rect_offset_x = parseInt(rect.attr("x")) + 0.5 * parseInt(rect.attr("width"));
    var rect_offset_y = parseInt(rect.attr("height"));

    var tooltip_width = parseInt($editpane.find(".tooltip").width());
    var tooltip_arrow_width = parseInt($editpane.find(".tooltip-arrow").outerWidth());

    var clipvis_width = $editpane.parent().width();
    var editpane_offset_x = rect_offset_x - 0.5 * tooltip_width;
    var editpane_offset_y = rect_offset_y;

    if (editpane_offset_x < 0) {
        $editpane.find(".tooltip-inner").css({
            "position": "relative",
            "left": -editpane_offset_x
        });
    }

    var rightmost_edge = editpane_offset_x + tooltip_width;
    if (rightmost_edge > clipvis_width) {
        $editpane.find(".tooltip-inner").css({
            "position": "relative",
            "left": -(rightmost_edge - clipvis_width) - 10
        });
    }

    $editpane.css({
        "position": "absolute",
        "left": editpane_offset_x,
        "top": editpane_offset_y
    });

    // If the user hits enter while typing, automatically trigger a submit:
    $("#edit-pane .tooltip .input-label").on("keydown", function (e) {
        var key = e.which || e.keyCode || e.keyChar;
        if (key == 13 /* Enter */) {
            $("#edit-pane .tooltip .submit-segment").click();
            editpane.remove_tooltip();
            e.preventDefault();
            return false;
        } else if (key == 27 /* Escape */) {
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
        segment.destroy({
            success: function () {
                $("segment-" + segment.id + "-group").remove();
            },
            failure: function (err) {
                console.log(err);
            }
        });
    });

    // If the "Submit" button's clicked (or if they hit enter) make a change:
    $("#edit-pane .tooltip .submit-segment").on("click", function () {
        var new_label = $("#edit-pane .tooltip .input-label").val();
        // This should trigger a Backbone sync() to the server:
        segment.save({ "label": new_label });
        editpane.remove_tooltip();
    });

    // Don't remember to make the edit pane visible after our changes:
    $editpane.css("visibility", "visible");
    // And change focus to the label input field:
    $("#edit-pane .tooltip .input-label").focus();
};

EditPane.prototype.remove_tooltip = function () {
    // Trigger the tooltip fade animation by removing the "in" class:
    $("#edit-pane .tooltip").removeClass("in");

    // And after the fade's done (in 500ms by default) remove the pane:
    setTimeout(function () {
        $("#edit-pane .tooltip").remove();
    }, 500);
};
