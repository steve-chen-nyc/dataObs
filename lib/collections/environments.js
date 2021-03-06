/*
* JS MongoDB collection init and methods file
* Environments
*/

Environments = new Mongo.Collection('environments');

Meteor.methods({


  environmentInsert: function(postAttributes) {

    var user = Meteor.user();
    var environment = _.extend(postAttributes, {
      userId: user._id,
      author: user.username,
      submitted: new Date(),
      lastModifiedParam: new Date(),
      lastModifiedObs: new Date(),
      inputStyle: 'box'
    });

    var envId = Environments.insert(environment);

    return {
      _id: envId
    };
  },
  environmentDelete: function(envId) {
    Environments.remove({
      _id: envId
    })
    Observations.remove({
      envId: envId
    })
    Sequences.remove({
      envId: envId
    })
    Subjects.remove({
      envId: envId
    })
    SubjectParameters.remove({
      'children.envId': envId
    })
    SequenceParameters.remove({
      'children.envId': envId
    })
  },

  exportAllParams: function(envId) {
    var seqParams = SequenceParameters.findOne({'children.envId': envId}) || null;
    var subjParams = SubjectParameters.findOne({'children.envId': envId}) || null;

    if (seqParams == null && subjParams == null) { return {} };

    var allParams = {};
    if (seqParams != null){
      allParams['sequence'] = seqParams['children'];
    }
    if (subjParams != null) {
      allParams['subject'] = subjParams['children'];
    }

    return allParams;

  },

  environmentModifyParam: function(envId) {
    var env = Environments.update({'_id': envId}, {$set: {'lastModifiedParam': new Date()}});
  },

  environmentModifyObs: function(envId) {
    var env = Environments.update({'_id': envId}, {$set: {'lastModifiedObs': new Date()}});
  },

  updateInputStyle: function(obj) {
    var env = Environments.update({'_id':obj.envId}, {$set: {'inputStyle':obj.inputStyle}});
  }
});
