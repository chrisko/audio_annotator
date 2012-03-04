// Chris Koenig <ckoenig@seas.upenn.edu>
// CIS-400 Senior Design Project

function Selection(el) {
    if (typeof(el) === "undefined")
        throw "A div is required.";

    this.el = el;
    this.current_selection = null;
}

Selection.prototype.begin_new_selection = function (event) {
    // As soon as the mouse goes down, the selection has zero width, and
    // starts and ends at the exact same X coordinate.
    this.current_selection = [ event.pageX - this.offsetLeft,
                               event.pageX - this.offsetLeft ];

    this.el.bind("mousemove.selection", this.update_selection);
    this.el.one("mouseup.selection mouseout.selection mouseleave.selection",
                 this.end_selection);
};

Selection.prototype.update_selection = function (event) {
    assert(this.current_selection !== null);
    assert(this.current_selection[0] !== null);

    // Keep the starting point, but update the ending point:
    var start = this.current_selection[0];
    this.current_selection = [ start, event.pageX - this.offsetLeft ];

    // In case anyone's listening, trigger the "selection_updated" event:
    this.el.trigger("selection_updated");
};

Selection.prototype.end_selection = function (event) {
    assert(this.current_selection !== null);
    assert(this.current_selection[0] !== null);
    assert(this.current_selection[1] !== null);

    // Get rid of the "mousemove" event we registered above:
    this.el.unbind("mousemove.selection", this.update_selection);

    // And trigger the "new_selection" event for the listeners out there:
    this.el.trigger("new_selection");
};

Selection.prototype.get_current_selection = function () {
    return this.current_selection;
};
