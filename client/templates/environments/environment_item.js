Template.environmentList.events({
  'click .viewEnvItem': function(e) {
     e.preventDefault();
     Router.go('observationsList', this);
  },
  'click .editObsItem': function(e) {
     e.preventDefault();
     Router.go('editSpec');
  }
});
