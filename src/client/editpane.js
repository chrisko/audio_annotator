// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

// Display an edit pane over a selected segment.

function EditPaneWindow(segment, options) {
    this.segment = segment;

    // Get the jQuery element by selecting by the segment class or id:
    this.segment_id = segment.isNew() ? ".new-segment"
                    : "#segment-" + segment.id + "-group";

    this.template = _.template($("#segment-edit-pane").html());
    this.init("tooltip", $(this.segment_id), options);
}

EditPaneWindow.prototype = $.extend({ }, $.fn.tooltip.Constructor.prototype, {
    setContent: function () {
        var $tip = this.tip();
        console.log($tip);

        $tip.find(".tooltip-inner").html(this.template({ label: this.segment.label || "" }));
    }
});

function EditPane(delegate, clip, segments) {
    this.delegate = delegate;
    this.clip = clip;
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

    // First, create the new segment (but don't yet send it to the server):
    var segment = this.segments.collection.create({
        // The "start" and "end" parameters are given as 0-1 values, for
        // how far along the clip the selection happened.
        start: this.clip.get("duration") * start,
        end: this.clip.get("duration") * end
    });

    // The clip should be rendered as soon as we add it above, thanks to the
    // Backbone Collection's "add" event that we bound to over in Segments.

    // Then go edit the segment. It'll check the isNew() attribute and
    // realize we haven't yet synced this segment to the server.
    this.edit_segment(segment);
};

EditPane.prototype.edit_segment = function (segment) {
    var tooltip = new EditPaneWindow(segment, {
        placement: "bottom",
        title: segment.isNew() ? "Edit new segment" : "Edit segment",
        trigger: "manual"
    });

    tooltip.show();

    // If we just made a selection to add a new segment, it hasn't yet been
    // synced to the server. Do that now, issuing a POST.
    if (segment.isNew())
        segment.save();
};
