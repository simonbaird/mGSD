
// for sorting tiddlers

merge(Tiddler.prototype,{

  sort_tickleDate: function() {
    return this.fields['mgtd_date'] || 'ZZZZZZZZ'; // i think that's enought to make undated tiddlers sort to the end
  },

  sort_orderSlice: function() {
    var orderSlice = store.getTiddlerSlice(this.title,"order");
    return orderSlice ? orderSlice : this.title; // so if there's no slice we get sorting by title
  },

  sort_prioritySlice: function() {
    var orderSlice = store.getTiddlerSlice(this.title,"priority");
    return orderSlice ? orderSlice : this.title; // so if there's no slice we get sorting by title
  }

});
